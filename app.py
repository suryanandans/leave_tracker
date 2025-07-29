
from datetime import datetime
import os
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
import pandas as pd
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
import io
import csv

app = Flask(__name__)

# Global list to temporarily store uploaded leave records
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:root@localhost/leave_tracker'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class LeaveRecord(db.Model):
    __tablename__ = 'leave_records'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    leave_date = db.Column(db.Date, nullable=False)
    leave_type = db.Column(db.Enum('Authorised', 'Medical', 'Weekend', 'Personal'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=db.func.now())


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/all_leaves', methods=['GET'])
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





if __name__ == '__main__':
    app.run(debug=True)
