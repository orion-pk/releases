import 'package:test/test.dart';
import 'package:academia/ocr_service.dart';

void main() {
  group('OCR Parser - BISE Rawalpindi Real Documents', () {
    test('Parses raw OCR output from Intermediate (HSSC) format', () {
      const interSampleText = '''
Batch-Sr.  1000:00/1-0-000000-1 000
Group ' GENERAL SCIENCE Result Card No, 12345
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION, RAWALPINDI
INTERMEDIATE EXAMINATION
Sr wr =
E (| RON leh FIRST ANNUAL 2022 .
fe =
; ark | 4 Roll No. 123456 Ted
Nom0limy JE Ce
See RESULT CARD TB AY
AHMAD KHAN DOENTEAMEDATE ANDSEC ONDA = = Serre
Son of TARIQ MEHMOOD
of Institution’ PUNJAB COLLEGE CIVIL LINES, RAWALPINDI
ETE Eee Be ee eso = hast secured the: marks
shown against. ‘each subject, in the Higher Secondary School Certificate Examination heid
ld he Ra SE Se Sn El Se fei ey
in the month of June-September, 2022 Registration No. 10000000001
Sd Subject(s) {Marks Obtained | Per- | | P/F | Remarks
No| 2xTh-1 Th-TL Pr Tot [centile Grade|
| 1 [ENGLISH 200 42 54F [ef 1D pass]
} i i
| Z [Rou 20042] 65 [71071535 [D+ [pass
} |
Hhiiny a mand sien aie Dees
} i | }
ED a Ca
Eloi sm es ol aes Soe eee 5
| 6 [PHYSICS 200 2] 35] 13| 76{38  |E |pass
| 7 [SovPUTER SCIENCE 200042[ 27] 367 105/52.76 D+ |pAss| N
Total Marks 504 /1100 FIVE HUNDRED FOUR GRADE D
2 ALON bugga SE IEE DRE Sone Th a JGRADE SB 1
General Remarks: THE CANDIDATE HAS PASSED.
Rawalpindi Dated: October 20, 2022 0
Dealing Official CONTROLLER EXAMINATIONS
Note: This Result Card is Provisional & Errors/omissions excepted.
''';

      final res = OcrService.parseDocumentText(interSampleText);
      expect(res['boardName'], equals('BISE Rawalpindi'));
      expect(res['degreeName'], equals('Intermediate (HSSC)'));
      expect(res['fullName'], contains('AHMAD KHAN'));
      expect(res['fatherName'], contains('TARIQ MEHMOOD'));
      expect(res['rollNo'], equals('123456'));
      expect(res['registrationNo'], equals('10000000001'));
      expect(res['marksObtained'], equals('504'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('D'));
      expect(res['group'], contains('GENERAL SCIENCE'));
      expect(res['institution'], contains('PUNJAB COLLEGE CIVIL LINES, RAWALPINDI'));
      expect(res['examMonth'], contains('June-September, 2022'));
    });

    test('Parses Matric (SSC) format correctly', () {
      const matricSampleText = '''
Batch-Sr. 0000-00/1-0000-0
Group SCIENCE
Result Card No. 000000
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION, RAWALPINDI
SECONDARY SCHOOL CERTIFICATE EXAMINATION
ANNUAL 2020
Roll No. 654321
RESULT CARD
USMAN ALI
Son of MUHAMMAD HASSAN
of Institution GOVT. HIGH SCHOOL, RAWALPINDI.
against each subject, in the Secondary School Certificate Examination held in the month of
FEBRUARY-MARCH, 2020
Registration No. 20000000002
Total Marks 766 / 1100 SEVEN HUNDRED SIXTY-SIX GRADE B
Date of Birth (In Figures) 01-01-2005
''';

      final res = OcrService.parseDocumentText(matricSampleText);
      expect(res['boardName'], equals('BISE Rawalpindi'));
      expect(res['degreeName'], equals('Matric (SSC)'));
      expect(res['fullName'], equals('USMAN ALI'));
      expect(res['fatherName'], equals('MUHAMMAD HASSAN'));
      expect(res['rollNo'], equals('654321'));
      expect(res['registrationNo'], equals('20000000002'));
      expect(res['marksObtained'], equals('766'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('B'));
      expect(res['group'], equals('SCIENCE'));
      expect(res['institution'], equals('GOVT. HIGH SCHOOL, RAWALPINDI.'));
      expect(res['examMonth'], equals('FEBRUARY-MARCH, 2020'));
      expect(res['dob'], equals('01-01-2005'));
    });

    // >>> [MODULE: BISE_GUJRANWALA_TEST] - START
    test('Parses BISE Gujranwala Marks Sheet SSC format correctly', () {
      const grwSample = '''
Board of Intermediate & Secondary Education,
Gujranwala

Session : Annual 2023
Marks Sheet SSC (P-II)
Group: SCIENCE
Roll No.: 440054 Registration No.: 2-1-1039764-21
Name: USMAN ALI Date of Birth: 15-12-2006
Father's Name: MUHAMMAD TARIQ Father CNIC: 34403-0000000-1
School: 141071-GHAZALI MODEL HIGH SCHOOL, PHALIA MANDI BAHA-UD-DIN
Total/Over All Grade: 1100 559 Grade: C
10th: 559
< The candidate has Passed >
''';

      final res = OcrService.parseDocumentText(grwSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Matric (SSC)'));
      expect(res['fullName'], equals('USMAN ALI'));
      expect(res['fatherName'], equals('MUHAMMAD TARIQ'));
      expect(res['rollNo'], equals('440054'));
      expect(res['registrationNo'], equals('2-1-1039764-21'));
      expect(res['marksObtained'], equals('559'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('C'));
      expect(res['group'], equals('SCIENCE'));
      expect(res['institution'], contains('GHAZALI MODEL HIGH SCHOOL'));
      expect(res['dob'], equals('15-12-2006'));
    });

    test('Parses BISE Gujranwala Marks Sheet HSSC format correctly', () {
      const grwInterSample = '''
Board of Intermediate & Secondary Education,
Gujranwala

Session : Annual 2023
Marks Sheet HSSC (P-II)
Group: PRE-ENGINEERING
Roll No.: 512345 Registration No.: 2-1-2000000-22
Name: BILAL AHMED Date of Birth: 10-05-2005
Father's Name: NADEEM AKHTAR Father CNIC: 34403-0000000-2
College: PUNJAB COLLEGE, SIALKOT
Total/Over All Grade: 1100 920 Grade: A+
10th: 920
< The candidate has Passed >
''';

      final res = OcrService.parseDocumentText(grwInterSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Intermediate (HSSC)'));
      expect(res['fullName'], equals('BILAL AHMED'));
      expect(res['fatherName'], equals('NADEEM AKHTAR'));
      expect(res['rollNo'], equals('512345'));
      expect(res['registrationNo'], equals('2-1-2000000-22'));
      expect(res['marksObtained'], equals('920'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('A+'));
      expect(res['group'], contains('PRE-ENGINEERING'));
      expect(res['institution'], contains('PUNJAB COLLEGE, SIALKOT'));
    });

    test('Parses BISE Gujranwala Old Certificate Format correctly', () {
      const grwOldSample = '''
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION
GUJRANWALA
Roll No. 235503 Enrolment No. 41053-2006-0182
Group SCIENCE Attempt (s) FIRST
SECONDARY SCHOOL CERTIFICATE EXAMINATION
ANNUAL, 2008
Certified that KAMAL ZAMAN
son / daughter of MUHAMMAD ZAMAN
whose date of birth is 25-04-1992
month of APRIL / MAY as a REGULAR
candidate from GOVT. PILOT SECONDARY SCHOOL PHALIA (MANDI BAHA-UD-DIN)
as per statement of marks given below and has obtained Grade A
TOTAL 850 597
( Marks in Words) The candidate has passed and obtained marks FIVE HUNDRED NINETY SEVEN.
''';

      final res = OcrService.parseDocumentText(grwOldSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Matric (SSC)'));
      expect(res['fullName'], equals('KAMAL ZAMAN'));
      expect(res['fatherName'], equals('MUHAMMAD ZAMAN'));
      expect(res['rollNo'], equals('235503'));
      expect(res['registrationNo'], equals('41053-2006-0182'));
      expect(res['marksObtained'], equals('597'));
      expect(res['totalMarks'], equals('850'));
      expect(res['grade'], equals('A'));
      expect(res['group'], equals('SCIENCE'));
      expect(res['institution'], contains('GOVT. PILOT SECONDARY SCHOOL PHALIA'));
      expect(res['dob'], equals('25-04-1992'));
    });

    test('Parses newly uploaded BISE Gujranwala computerized card with slash dates and alternate labels', () {
      const grwAltSample = '''
Board of Intermediate and Secondary Education Gujranwala
HSSC Examination First Annual 2024
Candidate's Name: HAMZA RIAZ
Father's Name: RIAZ AHMED
DOB: 12/08/2005
Roll No: 789123
Reg No.: 3-2-9988771-23
Group: PRE-MEDICAL
College: SUPERIOR COLLEGE GUJRANWALA
Total Marks: 875 / 1100
Grade: A
''';

      final res = OcrService.parseDocumentText(grwAltSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Intermediate (HSSC)'));
      expect(res['fullName'], equals('HAMZA RIAZ'));
      expect(res['fatherName'], equals('RIAZ AHMED'));
      expect(res['dob'], equals('12-08-2005'));
      expect(res['rollNo'], equals('789123'));
      expect(res['registrationNo'], equals('3-2-9988771-23'));
      expect(res['marksObtained'], equals('875'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('A'));
      expect(res['group'], contains('PRE-MEDICAL'));
      expect(res['institution'], contains('SUPERIOR COLLEGE GUJRANWALA'));
    });

    test('Parses newly uploaded BISE Rawalpindi Certificate with certified that and S/O', () {
      const rwpCertSample = '''
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION RAWALPINDI
HIGHER SECONDARY SCHOOL CERTIFICATE EXAMINATION
Certified that ZAIN UL ABIDEEN
S/O MUHAMMAD SHOAIB
Registration No. 10293847561
Roll No. 345678
Group COMMERCE
Institution: GOVT. DEGREE COLLEGE RAWALPINDI
Date of Birth: 20-11-2004
Total Marks 780 / 1100
Grade: A
FIRST ANNUAL 2023
''';

      final res = OcrService.parseDocumentText(rwpCertSample);
      expect(res['boardName'], equals('BISE Rawalpindi'));
      expect(res['degreeName'], equals('Intermediate (HSSC)'));
      expect(res['fullName'], equals('ZAIN UL ABIDEEN'));
      expect(res['fatherName'], equals('MUHAMMAD SHOAIB'));
      expect(res['dob'], equals('20-11-2004'));
      expect(res['rollNo'], equals('345678'));
      expect(res['registrationNo'], equals('10293847561'));
      expect(res['marksObtained'], equals('780'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('A'));
      expect(res['group'], contains('COMMERCE'));
      expect(res['institution'], contains('GOVT. DEGREE COLLEGE RAWALPINDI'));
      expect(res['examMonth'], contains('FIRST ANNUAL 2023'));
    });

    test('Parses marks and calculates grade correctly across varied formats', () {
      // 1. "out of" fraction
      const outOfSample = '''
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION RAWALPINDI
Roll No: 112233
Name: ALI RAZA
Son of ASLAM KHAN
Marks: 945 out of 1100
Grade: [A+]
''';
      final res1 = OcrService.parseDocumentText(outOfSample);
      expect(res1['marksObtained'], equals('945'));
      expect(res1['totalMarks'], equals('1100'));
      expect(res1['grade'], equals('A+'));

      // 2. Tabular summary with space in grade "A +"
      const spacedGradeSample = '''
Board of Intermediate & Secondary Education, Gujranwala
Roll No: 445566
Name: USMAN TARIQ
Son of TARIQ MEHMOOD
Part-II: 820
Total Marks: 1100
Grade: A +
''';
      final res2 = OcrService.parseDocumentText(spacedGradeSample);
      expect(res2['marksObtained'], equals('820'));
      expect(res2['totalMarks'], equals('1100'));
      expect(res2['grade'], equals('A+'));

      // 3. Fallback calculation when grade is missing
      const autoGradeSample = '''
Board of Intermediate & Secondary Education, Gujranwala
Roll No: 998877
Name: HAMZA KHAN
Son of KHAN SAHIB
Marks Obtained: 780 / 1100
''';
      final res3 = OcrService.parseDocumentText(autoGradeSample);
      expect(res3['marksObtained'], equals('780'));
      expect(res3['totalMarks'], equals('1100'));
      expect(res3['grade'], equals('A'));

      // 4. Pipe separator and Multiline Grade
      const pipeMultiLineSample = '''
BOARD OF INTERMEDIATE AND SECONDARY EDUCATION RAWALPINDI
Roll No: 654321
Name: BILAL HASSAN
Son of HASSAN ALI
Aggregate: 1015 | 1100
Grade:
A+
''';
      final res4 = OcrService.parseDocumentText(pipeMultiLineSample);
      expect(res4['marksObtained'], equals('1015'));
      expect(res4['totalMarks'], equals('1100'));
      expect(res4['grade'], equals('A+'));

      // 5. A1 notation
      const a1Sample = '''
Board of Intermediate & Secondary Education, Gujranwala
Roll No: 887766
Name: ASAD ALI
Son of ALI ASGHAR
Total Marks: 960 / 1100
Grade: A1
''';
      final res5 = OcrService.parseDocumentText(a1Sample);
      expect(res5['marksObtained'], equals('960'));
      expect(res5['totalMarks'], equals('1100'));
      expect(res5['grade'], equals('A+'));
    });

    test('Parses real Gujranwala SSC computerized card (guj.jpeg / guj.pdf format)', () {
      const gujSample = '''
Board of Intermediate & Secondary Education,
Gujranwala
Session : Annual 2023
Marks Sheet SSC (P-II)
Group: SCIENCE
Roll Mo.: 440054 Registration No.: 2-1-1039764-21
Name: MUHAMMAD ABDULLAH Date of Birth: 15-12-2006
Father's Name: M AYOUB MUGHAL Father CNIC: 34403-2916506-3
School: 141071-GHAZALI MODEL HIGH SCHOOL, PHALIA MANDI BAHA-UD-DIN
Total/Over All Grade: 1100 559 Grade: c
10th 559
< The candidate has Passed »
''';

      final res = OcrService.parseDocumentText(gujSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Matric (SSC)'));
      expect(res['fullName'], equals('MUHAMMAD ABDULLAH'));
      expect(res['fatherName'], equals('M AYOUB MUGHAL'));
      expect(res['rollNo'], equals('440054'));
      expect(res['registrationNo'], equals('2-1-1039764-21'));
      expect(res['marksObtained'], equals('559'));
      expect(res['totalMarks'], equals('1100'));
      expect(res['grade'], equals('C'));
      expect(res['group'], equals('SCIENCE'));
      expect(res['institution'], contains('GHAZALI MODEL HIGH SCHOOL'));
      expect(res['dob'], equals('15-12-2006'));
      expect(res['cnic'], equals('34403-2916506-3'));
      expect(res['examMonth'], equals('Annual 2023'));
    });

    test('Parses real Gujranwala 9th Class SSC result notification (2.png format)', () {
      const guj9thSample = '''
Secondary School Certificate (9th Class) Examination, 2024
Group: GENERAL

Roll No.: 316631 Registration No.: 2-3-1002500-23
Name: FARHAN KHALID Date of Birth: 20-06-2008

Father's Name: KHALID HUSSAIN Bind-Sr.No.: 50071-5
District: NAROWAL

Notification: 575
''';

      final res = OcrService.parseDocumentText(guj9thSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Matric (SSC)'));
      expect(res['fullName'], equals('FARHAN KHALID'));
      expect(res['fatherName'], equals('KHALID HUSSAIN'));
      expect(res['rollNo'], equals('316631'));
      expect(res['registrationNo'], equals('2-3-1002500-23'));
      expect(res['marksObtained'], equals('575'));
      expect(res['group'], equals('GENERAL'));
      expect(res['institution'], equals('NAROWAL'));
      expect(res['dob'], equals('20-06-2008'));
      expect(res['examMonth'], equals('2024'));
    });

    test('Parses real Gujranwala HSSC Intermediate Marks Sheet (3.png format)', () {
      const gujHsscSample = '''
Board of Intermediate & Secondary Education, Gujranwala
Session : First Annual 2022
Marks Sheet HSSC (P-II)
Group: PRE-MEDICAL
Roll No.: 119263 Registration No.: 2-2-6053403-20
Name: RIMSHA JAVED
Father's Name: JAVED YAQOOB CH
College: 222239-SUPERIOR COLLEGE FOR WOMEN, NEAR NATIONAL BANK , OPPOSITE SERVICE COLONY, G.T. GLJRAT
12th: PHY, CH, BIO
« Candidate has failed in subject(s) and eligible to reappear till Supplementary Examination, 2023 »
''';

      final res = OcrService.parseDocumentText(gujHsscSample);
      expect(res['boardName'], equals('BISE Gujranwala'));
      expect(res['degreeName'], equals('Intermediate (HSSC)'));
      expect(res['fullName'], equals('RIMSHA JAVED'));
      expect(res['fatherName'], equals('JAVED YAQOOB CH'));
      expect(res['rollNo'], equals('119263'));
      expect(res['registrationNo'], equals('2-2-6053403-20'));
      expect(res['group'], contains('PRE-MEDICAL'));
      expect(res['institution'], contains('SUPERIOR COLLEGE FOR WOMEN'));
      expect(res['examMonth'], equals('First Annual 2022'));
    });
    // <<< [MODULE: BISE_GUJRANWALA_TEST] - END
  });
}
