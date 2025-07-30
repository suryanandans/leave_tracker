
from datetime import datetime
from flask_bcrypt import Bcrypt
import os
from flask import Flask, request, jsonify, render_template
from flask import session, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
import io
import csv
from sqlalchemy import or_
from functools import wraps

app = Flask(__name__)
app.secret_key = 'leave_tracker_secret_key'
bcrypt = Bcrypt(app)

# Global list to temporarily store uploaded leave records
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:root@localhost/leave_tracker'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class AdminUser(db.Model):
    __tablename__ = 'admin_users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class LeaveRecord(db.Model):
    __tablename__ = 'leave_records'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    leave_date = db.Column(db.Date, nullable=False)
    leave_type = db.Column(db.Enum('Authorised', 'Medical', 'Weekend', 'Personal'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=db.func.now())

    
    
def login_required_api(f):
        @wraps(f)
        def decorated_function(*args,**kwargs):
            if 'admin' not in session:
                return jsonify({"Error " : "Unauthorized Access!Log in for access"}), 401
            return f(*args,**kwargs)
        return decorated_function

@app.route('/')
def home():
    return render_template('login.html')


@app.route('/dashboard')
def dashboard():
    if 'admin' not in session:
        flash("Login to continue")
        return redirect(url_for('login'))
    else:
        admin = AdminUser.query.filter_by(username=session['admin']).first()
        return render_template('index.html',username=admin.username, email=admin.email)
    


@app.route('/register',methods=['POST'])
def register():
    username=request.form.get('reg_username')
    email=request.form.get('reg_email')
    password=request.form.get('reg_password')
    confirm_password=request.form.get('reg_confirm_password')

    if not username or not email or not password:
        flash("Kindly fill all the fields for completing registration")
        return redirect(url_for('login'))
    if password!=confirm_password:
        flash("Password donot match!")
        return redirect(url_for('login'))
    existing = AdminUser.query.filter((AdminUser.username==username ) | (AdminUser.email==email)).first()
    if existing:
        flash("Username or Email Aldready Exists")
        return redirect(url_for('login'))
    new_admin=AdminUser(username=username, email=email)
    new_admin.set_password(password)
    db.session.add(new_admin)
    db.session.commit()
    flash("Registration Successfull! Login with given Credentials")
    return redirect(url_for('login'))
    
@app.route('/login',methods=['GET','POST'])
def login():
    if request.method == 'POST':

        username=request.form.get('login_username')
        password=request.form.get('login_password')

        print("Login Attempt → Username:", username, "| Password:", password)

        admin=AdminUser.query.filter( or_(
            AdminUser.username==username,
            AdminUser.email==username
        )).first()
        print("Admin Found:", admin)
        if admin and admin.check_password(password):
            session['admin'] = admin.username
            flash("Login Succesfull")
            return redirect(url_for('dashboard'))
        else:
            flash("Incorrect credentials!")
            return redirect(url_for('login'))
    return render_template('login.html')
    

@app.route('/all_leaves', methods=['GET'])
@login_required_api
def all_leaves():
    try:
        records = LeaveRecord.query.order_by(LeaveRecord.leave_date.asc()).all()

        return jsonify([
            {
                'username': r.username,
                'date': r.leave_date.strftime('%Y-%m-%d'),
                'leave_type': r.leave_type
            } for r in records
        ])
    except Exception as e:
        print("Error in /all_leaves:", e)
        return jsonify({'message': f'Server error: {str(e)}'}), 500



from sqlalchemy.exc import IntegrityError

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    file = request.files.get('file')
    if 'admin' not in session:
        flash("Session Expired")
        return redirect(url_for('login'))

    if not file:
        return jsonify({'message': 'No file uploaded'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)

        count = 0
        skipped = 0

        for row in csv_input:
            username = row['Username'].strip()
            date_str = row['Date'].strip()
            leave_type = row['LeaveType'].strip()

            try:
                leave_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                skipped += 1
                continue  # skip invalid dates

            # Create record
            record = LeaveRecord(
                username=username,
                leave_date=leave_date,
                leave_type=leave_type
            )
            db.session.add(record)

            try:
                db.session.commit()
                count += 1
            except IntegrityError:
                db.session.rollback()
                skipped += 1  # duplicate or invalid enum, etc.

        return jsonify({
            'message': f'{count} records uploaded successfully. {skipped} entries skipped (duplicates or invalid).'
        })

    except Exception as e:
        return jsonify({'message': f'Error processing CSV: {str(e)}'}), 500




@app.route('/leaves', methods=['GET'])
def get_leaves():
    username = request.args.get('username')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    month = request.args.get('month')  # Format: YYYY-MM

    query = LeaveRecord.query

    # Optional username filter
    if username:
        query = query.filter(LeaveRecord.username.ilike(f"%{username}%"))

    # Optional date range filter
    if start_date and end_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(LeaveRecord.leave_date.between(start, end))
        except ValueError:
            return jsonify({"message": "Invalid date format"}), 400

    # Optional month filter
    if month:
        try:
            year, mon = map(int, month.split('-'))
            query = query.filter(
                db.extract('year', LeaveRecord.leave_date) == year,
                db.extract('month', LeaveRecord.leave_date) == mon
            )
        except Exception:
            return jsonify({"message": "Invalid month format"}), 400

    # Final sorted result
    results = query.order_by(LeaveRecord.leave_date.asc()).all()

    return jsonify([
        {
            'username': r.username,
            'date': r.leave_date.strftime('%Y-%m-%d'),
            'leave_type': r.leave_type
        } for r in results
    ])

@app.route('/logout')
def logout():
    session.pop('admin',None)
    flash("You have Loggged out Succesfully")
    return redirect(url_for('login'))





if __name__ == '__main__':
    app.run(debug=True)
