-- =====================================================================
-- Production data load: 09_production_data.sql
-- Wipes all student/teacher/class/enrolment/assessment data, then
-- inserts the real roster. Admin account is preserved.
-- Run AFTER 08_grading_revamp.sql.
-- =====================================================================
begin;

-- 1. Wipe assessment + enrolment data (these reference students/teachers)
truncate table public.attendance,
               public.quran_recitation_grades,
               public.assessments,
               public.memorisation_revisions,
               public.memorisation_progress,
               public.dua_progress,
               public.class_students,
               public.class_teachers
   restart identity cascade;

-- 2. Wipe the entity tables. Profiles row for the admin keeps its role
--    but its student_id / teacher_id will be auto-NULL'd by the FKs.
delete from public.students;
delete from public.teachers;
delete from public.classes;

-- Reset the sequences (so the imported codes match staff_code/student_code
-- not the auto-incremented bigserial ids).
select setval(pg_get_serial_sequence('public.students',  'id'), 1, false);
select setval(pg_get_serial_sequence('public.teachers',  'id'), 1, false);
select setval(pg_get_serial_sequence('public.classes',   'id'), 1, false);

-- 3. Teachers (codes from Excel ID column) ---------------------------

insert into public.teachers (staff_code, first_name, last_name, status) values
  ('190', 'Saira', '', 'active'),
  ('189', 'Sadia', '', 'active'),
  ('187', 'Yasmin', '', 'active'),
  ('183', 'Ustad', 'Zahid', 'active'),
  ('198', 'Ustad', 'Haamid', 'active'),
  ('184', 'Ustad', 'Ramzan', 'active'),
  ('201', 'Maulana', 'Khalid', 'active'),
  ('199', 'Hafiz', 'Mohammed Ali', 'active'),
  ('200', 'Hafiz', 'Jamal', 'active'),
  ('197', 'Aneela', '', 'active'),
  ('195', 'Bushra', 'Khatoon', 'active'),
  ('196', 'Nasira', '', 'active'),
  ('192', 'Zahidah', '', 'active'),
  ('191', 'Nasreen', '', 'active'),
  ('186', 'Rukhsana', '', 'active'),
  ('185', 'Bushra', 'Hassan', 'active'),
  ('211', 'Allaama', 'Arshad Misbahi', 'active'),
  ('207', 'Hafiz', 'Faraaz Ahmed', 'active'),
  ('210', 'Hafiz', 'Naeem Raza', 'active'),
  ('208', 'Qari', 'Saifullah', 'active'),
  ('188', 'Saima', '', 'active'),
  ('194', 'Aneesa', '', 'active'),
  ('182', 'Iqrah', '', 'active'),
  ('203', 'Aisha', 'Iqbal', 'active'),
  ('212', 'Amina', 'Hussain', 'active'),
  ('205', 'Amna', 'Naz', 'active'),
  ('204', 'Halimah', 'Amin', 'active'),
  ('206', 'Robina', 'Kousar', 'active'),
  ('193', 'Sherbano', '', 'active'),
  ('213', 'Sufyaan', '', 'active'),
  ('214', 'Zooba', 'Butt', 'active');

update public.teachers set last_name = '-' where last_name = '' or last_name is null;


-- 4. Classes ---------------------------------------------------------
insert into public.classes (name, level, description) values
  ('B1', 'Boys', null),
  ('B1A', 'Boys', null),
  ('B2', 'Boys', null),
  ('B3', 'Boys', null),
  ('B4', 'Boys', null),
  ('B5', 'Boys', null),
  ('B6', 'Boys', null),
  ('B7', 'Boys', null),
  ('B8', 'Boys', null),
  ('G1', 'Girls', null),
  ('G1A', 'Girls', null),
  ('G2', 'Girls', null),
  ('G3', 'Girls', null),
  ('G4', 'Girls', null),
  ('G5', 'Girls', null),
  ('G6', 'Girls', null),
  ('Hifz - 1', 'Hifz', null),
  ('Hifz - 2', 'Hifz', null),
  ('Hifz - 3', 'Hifz', null),
  ('Hifz Girls', 'Hifz', null),
  ('Mix 2', 'Mixed', null),
  ('Transition - GS', 'Transition', null);

-- 5. Assign teachers to their class (lead). Pulled from Excel "Class" column.
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B1' and t.staff_code = '190';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B1A' and t.staff_code = '189';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B2' and t.staff_code = '187';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B3' and t.staff_code = '183';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B4' and t.staff_code = '198';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B5' and t.staff_code = '184';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B6' and t.staff_code = '201';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B7' and t.staff_code = '199';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'B8' and t.staff_code = '200';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G1' and t.staff_code = '197';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G1A' and t.staff_code = '195';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G2' and t.staff_code = '196';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G3' and t.staff_code = '192';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G4' and t.staff_code = '191';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G5' and t.staff_code = '186';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'G6' and t.staff_code = '185';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Hifz - 1' and t.staff_code = '211';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Hifz - 2' and t.staff_code = '207';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Hifz - 3' and t.staff_code = '210';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Hifz - 3' and t.staff_code = '208';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Hifz Girls' and t.staff_code = '188';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Mix 2' and t.staff_code = '194';
insert into public.class_teachers (class_id, teacher_id, is_lead) select c.id, t.id, true from public.classes c, public.teachers t where c.name = 'Transition - GS' and t.staff_code = '182';

-- 6. Students -------------------------------------------------------
insert into public.students (student_code, first_name, last_name, status) values
  ('574', 'Haider', 'Sardar', 'active'),
  ('979', 'Harris', 'Karim', 'active'),
  ('1063', 'Hussain', 'Sultan', 'active'),
  ('816', 'Imran', 'Ahmad', 'active'),
  ('581', 'Ismail', 'Ikram', 'active'),
  ('817', 'M Babar', 'Awan', 'active'),
  ('579', 'M Hasnain', 'Abas', 'active'),
  ('575', 'Muhammad Ali', 'Raza', 'active'),
  ('576', 'Muhammad Ehtisham', 'Afzal', 'active'),
  ('573', 'Muhammad Haider', 'Ali', 'active'),
  ('577', 'Muhammad Haider', 'Saleh', 'active'),
  ('578', 'Muhammad Haris', 'Rashid', 'active'),
  ('580', 'Muhammad Ibrahim', 'Memon', 'active'),
  ('582', 'Muhammad rayan', 'Ahmed', 'active'),
  ('982', 'Muhammad Zaviyaan', 'Mirza', 'active'),
  ('823', 'Saad', 'Ahmad', 'active'),
  ('585', 'Wajeeh', 'Bashir', 'active'),
  ('586', 'Zayn', 'Khan', 'active'),
  ('587', 'Zayn Ul Abideen', 'Abas', 'active'),
  ('572', 'Zeshan', 'Husain', 'active'),
  ('557', 'Abdul Wahab', 'Imran', 'active'),
  ('556', 'Abdullah', 'Rashid', 'active'),
  ('558', 'Ahmad Ali', 'Raza', 'active'),
  ('900', 'Ali Asghar', 'Mahmood', 'active'),
  ('561', 'Khizr', 'Rehan', 'active'),
  ('818', 'M Zayan', 'Afzal', 'active'),
  ('822', 'Mohammad', 'Rahmaan', 'active'),
  ('562', 'Mohammad Abdulbari', 'Uddin', 'active'),
  ('565', 'Mohammed Rayyaan', 'Ashraf', 'active'),
  ('566', 'Mohammed yahyah', 'Khalid', 'active'),
  ('583', 'Muhammad', 'Arham', 'active'),
  ('560', 'Muhammad hamdan', 'Ali', 'active'),
  ('563', 'Muhammad ibrahim', 'cheema sajjad', 'active'),
  ('564', 'Muhammad musa', 'Ahmed', 'active'),
  ('568', 'Rayyan', 'Shah', 'active'),
  ('569', 'Yousef', 'Ahmed', 'active'),
  ('570', 'Yusuf', 'Sumra', 'active'),
  ('571', 'Zayaan', 'Mahboob', 'active'),
  ('809', 'Abdullah', 'Ahmed', 'active'),
  ('592', 'Dawud', 'Abbas', 'active'),
  ('594', 'Izaan', 'Ali', 'active'),
  ('602', 'Mohammed', 'Cabdalla maxamed', 'active'),
  ('603', 'Muhammad', 'Ahsan', 'active'),
  ('604', 'Muhammad', 'Shahroz', 'active'),
  ('600', 'Muhammad Aadam', 'Faisal', 'active'),
  ('595', 'Muhammad Ali', 'Farrukh Murtaza', 'active'),
  ('601', 'Muhammad Ismail', 'Qureshi', 'active'),
  ('941', 'Muhammad Sami', 'Abdul', 'active'),
  ('1065', 'Muhammad Sarim', 'Abbas', 'active'),
  ('599', 'Muhammad yazdan', 'Yasin', 'active'),
  ('605', 'Nofel', 'Adnan Naz', 'active'),
  ('606', 'Saad', 'Rashid', 'active'),
  ('598', 'Shafay', 'Rana', 'active'),
  ('607', 'Tahir', 'Akram', 'active'),
  ('608', 'Zakariyya', 'Hussain', 'active'),
  ('611', 'Abdul Hadi', 'Khurram', 'active'),
  ('620', 'Abdullah', 'Hussain', 'active'),
  ('588', 'Adam', 'Mahmoud', 'active'),
  ('589', 'Adam', 'Shazaib', 'active'),
  ('591', 'Ahil', 'Miah', 'active'),
  ('616', 'Ali', 'Raza', 'active'),
  ('1003', 'Ibrahim', 'Ahsan Ullah', 'active'),
  ('628', 'Ibrahim', 'Mehmood Zaib', 'active'),
  ('593', 'Ibrahim', 'Riasat', 'active'),
  ('893', 'Mohammad Hassan', 'Abubakar', 'active'),
  ('945', 'Muhammad', 'Ali', 'active'),
  ('621', 'Muhammad -Al-Maaruf', 'Abdillah', 'active'),
  ('946', 'Muhammad Asim', 'Nawaz', 'active'),
  ('625', 'Muhammed zayaan', 'Ahtasham', 'active'),
  ('609', 'Raheem', 'Hussain', 'active'),
  ('617', 'Yahya', 'Sumra', 'active'),
  ('629', 'A.Subhan', 'Fahad', 'active'),
  ('630', 'Aaliyan', 'Malik', 'active'),
  ('613', 'Araiz', 'Mirza', 'active'),
  ('631', 'Awaab', 'Mirza', 'active'),
  ('632', 'Daoud', 'Mustafa', 'active'),
  ('949', 'Esa Ali', 'Ahmad', 'active'),
  ('622', 'Hashim', 'Karim', 'active'),
  ('635', 'Hussain Ali', 'Murtaza khalid', 'active'),
  ('614', 'Mohammed Uzair', 'Bashir', 'active'),
  ('993', 'Mohiuddin', 'Pirzada', 'active'),
  ('633', 'Muhammad', 'Haseeb', 'active'),
  ('627', 'Muhammad', 'Ismaeel', 'active'),
  ('615', 'Muhammad Amaar', 'Iqbal', 'active'),
  ('626', 'Muhammad Mohid', 'Umair', 'active'),
  ('619', 'Rayan', 'Afridi', 'active'),
  ('623', 'Rayyan', 'Ahmad', 'active'),
  ('639', 'Rehan', 'Kashif', 'active'),
  ('618', 'Subhan', 'Mohammad', 'active'),
  ('640', 'Yasin', 'Ali', 'active'),
  ('641', 'Yusuf', 'Abdul Jabbar', 'active'),
  ('642', 'Abdul Rahim', 'Rehman', 'active'),
  ('644', 'Ahad', 'Anjam', 'active'),
  ('645', 'Asfar', 'Razzaq', 'active'),
  ('646', 'Fahad', 'Anjam', 'active'),
  ('647', 'Habeeb', 'Azhar', 'active'),
  ('649', 'Haroon', 'Karim', 'active'),
  ('650', 'Harris', 'Khan', 'active'),
  ('995', 'Muhammad', 'Hisham', 'active'),
  ('653', 'Muhammad', 'Munib', 'active'),
  ('652', 'Muhammad Ibrahim', 'Chaudhry', 'active'),
  ('654', 'Muhammad Rehaan', 'Hayat', 'active'),
  ('657', 'Muhammed yahya', 'Fozdar', 'active'),
  ('656', 'Ruman', 'Sajjad', 'active'),
  ('658', 'Zakriya', 'Kamran', 'active'),
  ('643', 'Adil', 'Hussain', 'active'),
  ('942', 'Aleemudeen', 'Muzammil', 'active'),
  ('874', 'Hamza', 'Ahmed', 'active'),
  ('851', 'Hashim', 'Ali', 'active'),
  ('889', 'Hashmat', 'Rahmani', 'active'),
  ('651', 'Mohammad Ali', 'Hussain Rubab', 'active'),
  ('875', 'Mohammed Ali', 'Khalid', 'active'),
  ('877', 'Mohammed Hasnain', 'Mazhar Nawaz', 'active'),
  ('871', 'Moiz', 'Umair', 'active'),
  ('655', 'Muhammad', 'Abdullah', 'active'),
  ('944', 'Muhammad', 'Rajab', 'active'),
  ('894', 'Muhammad Hasher', 'Riaz', 'active'),
  ('968', 'Muhammad Luqman', 'Ali', 'active'),
  ('879', 'Muhammad Saaim', 'Hussain Sajid', 'active'),
  ('883', 'Rehan', 'Rehman', 'active'),
  ('884', 'Tayyab', 'Naseer', 'active'),
  ('853', 'Aayan', 'Akhtar', 'active'),
  ('1127', 'Abdul-Qadir', 'Naeem', 'active'),
  ('975', 'Abu Bakar', 'Rizwan', 'active'),
  ('854', 'Ali', 'Hassan', 'active'),
  ('888', 'Ali', 'Mohammad Noreen', 'active'),
  ('1062', 'Bilal', 'Hussain', 'active'),
  ('872', 'Binyamin', 'Afridi', 'active'),
  ('860', 'Hamad', 'Raza', 'active'),
  ('977', 'Ibraheem', 'Rizwan', 'active'),
  ('863', 'Mohammed Aswad', 'Ali', 'active'),
  ('996', 'MUHAMMAD', 'Hasnain', 'active'),
  ('948', 'Muhammad  Hussnain', 'Akram', 'active'),
  ('991', 'Muhammad Hasnain', 'Ali', 'active'),
  ('862', 'Muhammad Mueez', 'Saleh', 'active'),
  ('865', 'Mujtaba', 'Waqas', 'active'),
  ('882', 'Muneeb', 'Waheed', 'active'),
  ('867', 'Muzzamil', 'Nazir', 'active'),
  ('868', 'Shayan', 'Saqib', 'active'),
  ('869', 'Sulaiman', 'Sajjad', 'active'),
  ('870', 'Zain', 'Yousaf', 'active'),
  ('843', 'Abu bakar', 'Bilal', 'active'),
  ('891', 'Adam', 'Malik', 'active'),
  ('937', 'Afnan', 'Iqbal', 'active'),
  ('848', 'Haidar', 'Ali', 'active'),
  ('981', 'Haroon', 'Sajid', 'active'),
  ('842', 'Ibrahim', 'Bilal', 'active'),
  ('841', 'Idrees', 'Ahmed', 'active'),
  ('844', 'Maqsuod', 'Hussain', 'active'),
  ('859', 'Mohammad  Ahmed', 'Bin Khalil', 'active'),
  ('890', 'Mohiuddin', 'Hussain', 'active'),
  ('1067', 'Muhammad Hashim', 'Abbas', 'active'),
  ('934', 'Muhammad Rayyan', 'Khurram', 'active'),
  ('994', 'Muhammad Salahuddin', 'Shah', 'active'),
  ('887', 'Muhammad shumas', 'cheema sajjad', 'active'),
  ('846', 'Muhd Yaseer', 'Olateju', 'active'),
  ('866', 'Murtaza', 'Waqas', 'active'),
  ('852', 'Qasim', 'Azhar', 'active'),
  ('837', 'Sami', 'Azam', 'active'),
  ('847', 'Zaiyan', 'Akram', 'active'),
  ('659', 'Aiza', 'Saqib', 'active'),
  ('660', 'Aizah', 'Rehman', 'active'),
  ('661', 'Alvina', 'Rehman', 'active'),
  ('985', 'Amariyah', 'Noor', 'active'),
  ('664', 'Arwaa', 'Rathore', 'active'),
  ('813', 'Fareedah', 'Almi', 'active'),
  ('666', 'Fatima', 'Ikram', 'active'),
  ('667', 'Hafsa', 'Hassan', 'active'),
  ('668', 'Hawa', 'Hussain', 'active'),
  ('896', 'Huda', 'Junaid', 'active'),
  ('669', 'Huda', 'Mahmoud', 'active'),
  ('670', 'Inaaya', 'Qaddafi', 'active'),
  ('671', 'Javeria', 'Khan', 'active'),
  ('672', 'Khadidzha', 'Abdullahi', 'active'),
  ('1006', 'Khadija', 'Abbasi', 'active'),
  ('819', 'Maria', 'Harkan', 'active'),
  ('820', 'Minnah', 'Ashraf', 'active'),
  ('821', 'Mirha', 'Ahmed Malik', 'active'),
  ('676', 'Umme', 'Hani', 'active'),
  ('677', 'Warda', 'Usman', 'active'),
  ('678', 'Zainab', 'Firdaus Ahmed', 'active'),
  ('702', 'Aaira', 'Husnain', 'active'),
  ('703', 'Abeeha', 'Mustafa', 'active'),
  ('704', 'Fajar', 'Bashir', 'active'),
  ('834', 'Fatima', 'Abubakr', 'active'),
  ('814', 'Hadiya', 'Fatima', 'active'),
  ('705', 'Haniya', 'Waqar', 'active'),
  ('706', 'Hareem', 'Faisal', 'active'),
  ('707', 'Inaaya', 'Fatima', 'active'),
  ('708', 'Laiba', 'Razzaq', 'active'),
  ('709', 'Liyana', 'Abas', 'active'),
  ('710', 'Maryam', 'Tufail', 'active'),
  ('711', 'Meerab', 'Fatima', 'active'),
  ('712', 'Muskan', 'Nasif', 'active'),
  ('713', 'Safora', 'Rahmani', 'active'),
  ('715', 'Zaima Noor', 'Ahtasham', 'active'),
  ('716', 'Zara', 'Adil', 'active'),
  ('717', 'Zara', 'Ditta', 'active'),
  ('718', 'Zarmeesha', 'Malik', 'active'),
  ('899', 'Zoya', 'Nazim', 'active');

insert into public.students (student_code, first_name, last_name, status) values
  ('679', 'Abiha', 'Usman', 'active'),
  ('686', 'Alayna', 'Hussain', 'active'),
  ('684', 'Alayna', 'Saqib Kiani', 'active'),
  ('689', 'Aqsa', 'Riaz', 'active'),
  ('682', 'Ayesha', 'Anwar', 'active'),
  ('690', 'Dua', 'Afzal', 'active'),
  ('976', 'Dua', 'Rizwan', 'active'),
  ('691', 'Eshaal Fatima', 'Masood', 'active'),
  ('692', 'Eshal', 'Eman', 'active'),
  ('693', 'Eshal', 'Ijaz', 'active'),
  ('694', 'Ilyana', 'Hisham Dawood', 'active'),
  ('984', 'Inayah', 'Begum', 'active'),
  ('696', 'Jannat', 'Nazir', 'active'),
  ('697', 'Khadija', 'Khan', 'active'),
  ('699', 'Saara', 'Malik', 'active'),
  ('700', 'Safa', 'Adil', 'active'),
  ('714', 'Samreen', 'Rahman', 'active'),
  ('935', 'Zahra', 'Abubaker', 'active'),
  ('701', 'Zianab', 'Wazir', 'active'),
  ('719', 'Zimal', 'Fatima Ahtasham', 'active'),
  ('681', 'Ahlam', 'Abdullahi', 'active'),
  ('721', 'Aliza', 'Bilal Ikram', 'active'),
  ('797', 'Amirah', 'Smahi', 'active'),
  ('723', 'Asmara', 'Fahad', 'active'),
  ('725', 'Ayesha', 'Zafar', 'active'),
  ('724', 'Ayesha Masoom', 'Khan Riaz', 'active'),
  ('747', 'Faiza', 'Azmi', 'active'),
  ('1005', 'Fatima', 'Abbasi', 'active'),
  ('727', 'Fatima', 'Mehmood', 'active'),
  ('728', 'Hafsa', 'Wazir', 'active'),
  ('729', 'Imaan', 'Mohammad', 'active'),
  ('730', 'Mahroosh', 'Bibi', 'active'),
  ('731', 'Maya Noor', 'Ditta', 'active'),
  ('770', 'Meher', 'Afzal', 'active'),
  ('733', 'Noor Fatima', 'Hussain', 'active'),
  ('734', 'Rida', 'Akhtar', 'active'),
  ('980', 'Safa', 'Kauser', 'active'),
  ('736', 'Sumayyah', 'Ali', 'active'),
  ('737', 'Zeenat', 'Khan', 'active'),
  ('738', 'Zoya', 'Riaz', 'active'),
  ('739', 'Aiza', 'Butt', 'active'),
  ('740', 'Aiza', 'Muhammad Noreen', 'active'),
  ('776', 'Aleena', 'Pervaiz', 'active'),
  ('742', 'Amina', 'Abdullahi', 'active'),
  ('744', 'Areej', 'Javed', 'active'),
  ('745', 'Ayesha', 'Noor Amjad', 'active'),
  ('746', 'Eiliyah', 'Shah', 'active'),
  ('726', 'Eshaal', 'Qureshi', 'active'),
  ('748', 'Falaq', 'Bashir', 'active'),
  ('786', 'Halima', 'Athar', 'active'),
  ('749', 'Inaya', 'Abdul', 'active'),
  ('750', 'Inayah', 'Ali', 'active'),
  ('769', 'Madiha', 'Afzal', 'active'),
  ('751', 'Mahreen', 'Rahman', 'active'),
  ('732', 'Nashmiya', 'Rehan', 'active'),
  ('752', 'Safaa', 'Ahmed', 'active'),
  ('735', 'Shanzay', 'Rana', 'active'),
  ('753', 'Tehzeeb', 'Malik', 'active'),
  ('754', 'Zoya', 'Khalil', 'active'),
  ('755', 'Zurain fatima', 'Uddin', 'active'),
  ('983', 'Abira', 'Alam', 'active'),
  ('757', 'Areeba', 'Ahmed', 'active'),
  ('759', 'Fatimah', 'Naseer', 'active'),
  ('760', 'Habeeba', 'Ateeq', 'active'),
  ('761', 'Hafsa', 'Athar', 'active'),
  ('762', 'Haleema', 'Cheema Sajjad', 'active'),
  ('763', 'Hira', 'Imran', 'active'),
  ('765', 'Huma', 'Rahman', 'active'),
  ('787', 'Inzha', 'Fakhar', 'active'),
  ('766', 'Irhaa', 'Fatima', 'active'),
  ('768', 'Maahrukh', 'Rani', 'active'),
  ('1066', 'Manahil', 'Abbas', 'active'),
  ('771', 'Menaal', 'Zaheer', 'active'),
  ('772', 'Mishall', 'Zaheer', 'active'),
  ('773', 'Muqadas', 'Rahmani', 'active'),
  ('1082', 'Samiya', 'Nasir', 'active'),
  ('1083', 'Sehrish', 'Nasir', 'active'),
  ('775', 'Zainab', 'Khan', 'active'),
  ('777', 'Aminah', 'Rafaqat', 'active'),
  ('778', 'Amira', 'Abdullahi', 'active'),
  ('779', 'Anaya', 'Khan', 'active'),
  ('780', 'Arush', 'Fatima', 'active'),
  ('782', 'Ayat', 'Muhammad', 'active'),
  ('781', 'Ayat Fatima', 'Uddin', 'active'),
  ('784', 'Fareeha', 'Bibi', 'active'),
  ('788', 'Khadijah', 'Azhar', 'active'),
  ('789', 'Maria', 'Slamzadeh', 'active'),
  ('897', 'Noor Fatima', 'Hussain', 'active'),
  ('791', 'Sabiha', 'Ahmad', 'active'),
  ('793', 'Saima', 'Noor', 'active'),
  ('794', 'Wajiha', 'Ahmad', 'active'),
  ('795', 'Abd-E-Abbas', 'Khan', 'active'),
  ('796', 'Abdullah', 'Imran', 'active'),
  ('845', 'Afnan', 'Abdullahi', 'active'),
  ('683', 'Alaa', 'Isaaq', 'active'),
  ('687', 'Anam', 'Khalil', 'active'),
  ('798', 'Ayesha', 'Waheed', 'active'),
  ('799', 'Eesa', 'Asif', 'active'),
  ('800', 'Essa', 'Azeem', 'active'),
  ('801', 'Imaad', 'Chopda', 'active'),
  ('802', 'Imaad', 'Rehan', 'active'),
  ('804', 'Midhat', 'Umair', 'active'),
  ('803', 'Muhammad irtaza', 'Iqbal', 'active'),
  ('698', 'Nalain', 'Zahra', 'active'),
  ('1128', 'Ruqaiyah', 'Naeem', 'active'),
  ('806', 'Sami', 'Mohammad', 'active'),
  ('824', 'Zahra', 'Irfan', 'active'),
  ('808', 'Zainah', 'Ashraf', 'active'),
  ('997', 'Afsa', 'Ahmed', 'active'),
  ('810', 'Ahmad', 'Rahman', 'active'),
  ('811', 'Aleena', 'Baig', 'active'),
  ('812', 'Amirah', 'Rehman', 'active'),
  ('986', 'Ayat', 'Ali', 'active'),
  ('1007', 'Ayesha', 'Abbasi', 'active'),
  ('815', 'Hooriya', 'Waqar', 'active'),
  ('978', 'Ibraheem', 'Danyal', 'active'),
  ('1004', 'Ismail', 'Ahsan Ullah', 'active'),
  ('936', 'Maira', 'Hussain', 'active'),
  ('1090', 'Maryam', 'Hussain', 'active'),
  ('989', 'Mohammad Musa', 'Abbas', 'active'),
  ('1081', 'Mohammed Abbas', 'Raja', 'active'),
  ('990', 'Muhammad Azaan', 'Faisal', 'active'),
  ('1012', 'Muhammad Tayyub', 'Dar', 'active'),
  ('1068', 'Muhammad Zohan', 'Janjua', 'active'),
  ('895', 'Safa', 'Khurram', 'active'),
  ('971', 'Yusuf', 'Ali', 'active'),
  ('987', 'Zakariya', 'Noor', 'active'),
  ('1091', 'Zarnish', 'Mohsin', 'active'),
  ('966', 'Haris', 'Ahmed', 'active'),
  ('965', 'Hassan', 'Iqbal', 'active'),
  ('954', 'Mohammed', 'Hasnain', 'active'),
  ('955', 'Mohammed', 'Rayhan', 'active'),
  ('876', 'Mohammed Hasnain', 'Ahmed', 'active'),
  ('950', 'Muhammad', 'Haroon', 'active'),
  ('957', 'Muhammad', 'Hashim', 'active'),
  ('969', 'Muhammad Hadi', 'Hussain Ali', 'active'),
  ('958', 'Muhammad Husain', 'Haji', 'active'),
  ('967', 'Muhammad Ibrahim', 'Zahid', 'active'),
  ('953', 'Muhammad Mahma', 'Ahmad Sarfraz', 'active'),
  ('861', 'Muhammad Mueen', 'Saleh', 'active'),
  ('964', 'Muhammad Umar', 'Arshad', 'active'),
  ('970', 'Muhammed Hasaan', 'Niaz', 'active'),
  ('959', 'Muhmmed', 'Qasim', 'active'),
  ('962', 'Muneeb', 'Arshad', 'active'),
  ('960', 'Mustafa A', 'Akhtar', 'active'),
  ('963', 'Sufyan', 'Shahid', 'active'),
  ('922', 'Ahmed', 'Asif', 'active'),
  ('917', 'Arman', 'Ali', 'active'),
  ('873', 'Haidar', 'Ahmad', 'active'),
  ('920', 'Hayaan', 'Ahmed', 'active'),
  ('921', 'Jamaal', 'Rabbani', 'active'),
  ('924', 'Mohammad Ismaeel', 'Hussain', 'active'),
  ('923', 'Muhammad  Hamza', 'Taiyab', 'active'),
  ('928', 'Murtaza', 'Imran', 'active'),
  ('929', 'Mustafa', 'Ahmed', 'active'),
  ('638', 'Mustafa', 'Hassan', 'active'),
  ('925', 'Nafe', 'Asif', 'active'),
  ('926', 'Rehaan', 'Shabbir', 'active'),
  ('931', 'Zain', 'Khan', 'active'),
  ('933', 'Zeyn Al Abidin', 'Abdullah', 'active'),
  ('901', 'Afaan', 'Ahmed', 'active'),
  ('902', 'Ayaan', 'Khan', 'active'),
  ('903', 'Ayaan', 'Rathore', 'active'),
  ('972', 'Bilal', 'Syed Qureshi', 'active'),
  ('904', 'Danyaal', 'Rathore', 'active'),
  ('634', 'Haseeb', 'Ul Rehman', 'active'),
  ('906', 'Hassan', 'Azmi', 'active'),
  ('908', 'Mohammed', 'Hasnain', 'active'),
  ('973', 'Muhammad Ayan', 'Sher', 'active'),
  ('636', 'Muhammad Bilal', 'Athar', 'active'),
  ('637', 'Muhammad Eesa', 'Faisal', 'active'),
  ('907', 'Muhammad Umair', 'Ahmed', 'active'),
  ('909', 'Mujeeb', 'Ur Rehman', 'active'),
  ('911', 'Qasim', 'Mohammad', 'active'),
  ('912', 'Rafay', 'M Taslem', 'active'),
  ('913', 'Rasheed', 'Hussain', 'active'),
  ('914', 'Sufiyan', 'Riaz', 'active'),
  ('915', 'Ubaid', 'Ur Rehman', 'active'),
  ('910', 'Umar', 'Rehman', 'active'),
  ('916', 'Yusuf', 'Azmi', 'active'),
  ('825', 'Aisha', 'Munir', 'active'),
  ('827', 'Amber', 'Fatima', 'active'),
  ('828', 'Dur E', 'Saman', 'active'),
  ('829', 'Maira', 'Javed', 'active'),
  ('830', 'Momina', 'Mehmood Zaib', 'active'),
  ('826', 'Aleena', 'Shah', 'active');

-- 7. Enrol students into their class, set the primary teacher per the
--    CSV "Teachers" column.
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '574' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '979' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '1063' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '816' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '581' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '817' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '579' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '575' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '576' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '573' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '577' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '578' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '580' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '582' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '982' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '823' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '585' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '586' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '587' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1' and s.student_code = '572' and t.staff_code = '190';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '557' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '556' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '558' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '900' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '561' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '818' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '822' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '562' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '565' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '566' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '583' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '560' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '563' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '564' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '568' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '569' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '570' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B1A' and s.student_code = '571' and t.staff_code = '189';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '809' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '592' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '594' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '602' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '603' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '604' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '600' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '595' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '601' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '941' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '1065' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '599' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '605' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '606' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '598' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '607' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B2' and s.student_code = '608' and t.staff_code = '187';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '611' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '620' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '588' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '589' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '591' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '616' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '1003' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '628' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '593' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '893' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '945' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '621' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '946' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '625' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '609' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B3' and s.student_code = '617' and t.staff_code = '183';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '629' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '630' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '613' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '631' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '632' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '949' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '622' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '635' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '614' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '993' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '633' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '627' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '615' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '626' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '619' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '623' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '639' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '618' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '640' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B4' and s.student_code = '641' and t.staff_code = '198';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '642' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '644' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '645' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '646' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '647' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '649' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '650' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '995' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '653' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '652' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '654' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '657' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '656' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B5' and s.student_code = '658' and t.staff_code = '184';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '643' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '942' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '874' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '851' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '889' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '651' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '875' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '877' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '871' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '655' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '944' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '894' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '968' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '879' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '883' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B6' and s.student_code = '884' and t.staff_code = '201';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '853' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '1127' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '975' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '854' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '888' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '1062' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '872' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '860' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '977' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '863' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '996' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '948' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '991' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '862' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '865' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '882' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '867' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '868' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '869' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B7' and s.student_code = '870' and t.staff_code = '199';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '843' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '891' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '937' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '848' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '981' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '842' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '841' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '844' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '859' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '890' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '1067' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '934' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '994' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '887' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '846' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '866' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '852' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '837' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'B8' and s.student_code = '847' and t.staff_code = '200';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '659' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '660' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '661' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '985' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '664' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '813' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '666' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '667' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '668' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '896' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '669' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '670' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '671' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '672' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '1006' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '819' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '820' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '821' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '676' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '677' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1' and s.student_code = '678' and t.staff_code = '197';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '702' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '703' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '704' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '834' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '814' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '705' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '706' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '707' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '708' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '709' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '710' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '711' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '712' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '713' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '715' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '716' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '717' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '718' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G1A' and s.student_code = '899' and t.staff_code = '195';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '679' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '686' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '684' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '689' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '682' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '690' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '976' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '691' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '692' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '693' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '694' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '984' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '696' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '697' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '699' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '700' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '714' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '935' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '701' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G2' and s.student_code = '719' and t.staff_code = '196';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '681' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '721' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '797' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '723' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '725' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '724' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '747' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '1005' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '727' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '728' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '729' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '730' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '731' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '770' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '733' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '734' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '980' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '736' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '737' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G3' and s.student_code = '738' and t.staff_code = '192';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '739' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '740' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '776' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '742' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '744' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '745' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '746' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '726' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '748' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '786' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '749' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '750' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '769' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '751' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '732' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '752' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '735' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '753' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '754' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G4' and s.student_code = '755' and t.staff_code = '191';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '983' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '757' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '759' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '760' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '761' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '762' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '763' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '765' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '787' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '766' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '768' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '1066' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '771' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '772' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '773' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '1082' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '1083' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G5' and s.student_code = '775' and t.staff_code = '186';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '777' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '778' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '779' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '780' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '782' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '781' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '784' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '788' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '789' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '897' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '791' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '793' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'G6' and s.student_code = '794' and t.staff_code = '185';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '795' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '796' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '845' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '683' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '687' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '798' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '799' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '800' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '801' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '802' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '804' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '803' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '698' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '1128' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '806' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '824' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Mix 2' and s.student_code = '808' and t.staff_code = '194';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '997' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '810' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '811' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '812' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '986' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1007' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '815' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '978' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1004' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '936' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1090' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '989' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1081' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '990' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1012' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1068' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '895' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '971' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '987' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Transition - GS' and s.student_code = '1091' and t.staff_code = '182';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '966' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '965' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '954' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '955' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '876' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '950' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '957' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '969' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '958' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '967' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '953' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '861' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '964' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '970' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '959' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '962' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '960' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 1' and s.student_code = '963' and t.staff_code = '211';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '922' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '917' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '873' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '920' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '921' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '924' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '923' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '928' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '929' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '638' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '925' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '926' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '931' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 2' and s.student_code = '933' and t.staff_code = '207';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '901' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '902' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '903' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '972' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '904' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '634' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '906' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '908' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '973' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '636' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '637' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '907' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '909' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '911' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '912' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '913' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '914' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '915' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '910' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz - 3' and s.student_code = '916' and t.staff_code = '208';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '825' and t.staff_code = '188';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '827' and t.staff_code = '188';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '828' and t.staff_code = '188';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '829' and t.staff_code = '188';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '830' and t.staff_code = '188';
insert into public.class_students (class_id, student_id, primary_teacher_id) select c.id, s.id, t.id from public.classes c, public.students s, public.teachers t where c.name = 'Hifz Girls' and s.student_code = '826' and t.staff_code = '188';

commit;

do $$ declare
    nt int; ns int; nc int; nct int; ncs int;
begin
    select count(*) into nt  from public.teachers;
    select count(*) into ns  from public.students;
    select count(*) into nc  from public.classes;
    select count(*) into nct from public.class_teachers;
    select count(*) into ncs from public.class_students;
    raise notice 'Loaded: % teachers, % students, % classes, % class-teacher links, % enrolments',
        nt, ns, nc, nct, ncs;
end $$;
