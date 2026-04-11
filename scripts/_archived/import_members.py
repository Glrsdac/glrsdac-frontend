import csv
import uuid
import psycopg2
from datetime import datetime

# Database connection settings

import os
from urllib.parse import urlparse

# Use Supabase DB connection string from .env
raw_url = os.getenv('SUPABASE_DB_URL', 'postgresql://postgres.upqwgwemuaqhnxskxbfr:glrsd@c2026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres')
parsed = urlparse(raw_url)
user = parsed.username
password = parsed.password
host = parsed.hostname
port = parsed.port
dbname = parsed.path.lstrip('/')

DB_URL = f"host={host} port={port} dbname={dbname} user={user} password={password}"

CSV_FILE = 'Gloryland Data Report.csv'

# Map CSV columns to normalized schema
MEMBER_FIELDS = [
    'member_no', 'first_name', 'last_name', 'full_name', 'known_as', 'title', 'gender', 'dob', 'status'
]
CONTACT_FIELDS = [
    'work_phone', 'cellular', 'email'
]
ADDRESS_FIELDS = [
    'address', 'address line 2', 'city', 'region', 'country', 'postal_code'
]
PERSONAL_FIELDS = [
    'country_of_birth', 'birth_place', 'marital_status', 'father_name', 'mother_name', 'occupation_name', 'education_degree', 'document_id', 'other_document_id'
]
BAPTISM_FIELDS = [
    'baptism_date', 'baptism_place', 'baptism_by', 'conversion_method_primary', 'conversion_method_secondary'
]

# Helper to parse date

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, '%d/%m/%Y').date()
    except Exception:
        return None


# Connect to DB using connection string
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

with open(CSV_FILE, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        member_id = str(uuid.uuid4())
        # Insert into members
        cur.execute('''
            INSERT INTO public.members (id, member_no, first_name, last_name, full_name, known_as, title, gender, dob, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            member_id,
            row['Person code'],
            row['Name'],
            row['Last Name'],
            row['Full Name'],
            row['Known as'],
            row['Title'],
            row['Gender'],
            parse_date(row['Birth Date']),
            'ACTIVE'
        ))
        # Insert into member_contacts
        cur.execute('''
            INSERT INTO public.member_contacts (member_id, work_phone, cellular, email)
            VALUES (%s, %s, %s, %s)
        ''', (
            member_id,
            row['Work Phone'],
            row['Cellular'],
            row['Email']
        ))
        # Insert into member_addresses
        cur.execute('''
            INSERT INTO public.member_addresses (member_id, address_line1, address_line2, city, region, country, postal_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            member_id,
            row['Address'],
            row['Address line 2'],
            row['City'],
            row['Region'],
            row['Country'],
            row['Postal Code']
        ))
        # Insert into member_personal_details
        cur.execute('''
            INSERT INTO public.member_personal_details (member_id, country_of_birth, birth_place, marital_status, father_name, mother_name, occupation_name, education_degree, document_id, other_document_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            member_id,
            row['Country of Birth'],
            row['Birth Place'],
            row['Marital Status'],
            row["Father's Name"],
            row["Mother's Name"],
            row['Occupation name'],
            row['Education Degree'],
            row['Document ID'],
            row['Other Document ID']
        ))
        # Insert into member_baptisms
        cur.execute('''
            INSERT INTO public.member_baptisms (member_id, baptism_date, baptism_place, baptized_by, conversion_method_primary, conversion_method_secondary)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            member_id,
            parse_date(row['Baptism Date']),
            row['Baptism Place'],
            row['Baptism by'],
            row['Primary Conversion Method'],
            row['Secondary Conversion Method']
        ))
        # Commit after each row for safety
        conn.commit()

cur.close()
conn.close()
print('Import complete.')
