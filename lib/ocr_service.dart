import 'dart:async';
import 'dart:convert';
import 'dart:io';

class OcrService {
  static const List<Map<String, dynamic>> boardTemplates = [
    {
      'id': 'bise_rawalpindi',
      'name': 'BISE Rawalpindi',
      'aliases': ['RAWALPINDI', 'RAWAL PINDI', 'RAWAL-PINDI', 'RWP', 'PINDI'],
      'patterns': {
        'studentName': [
          r'Certified\s+that[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:son\s*\/\s*daughter|son\s+of|daughter\s+of|whose|candidate|has\s+secured|held\s+in|\n|$))',
          r'(?:Student(?:[\x27\s]*s)?\s*Name|Candidate(?:[\x27\s]*s)?\s*Name|(?:^|\n)\s*Name)[\s:]+([A-Za-z\s.]+?)(?=\s*(?:Date\s*of\s*Birth|DOB|Father|Son|Daughter|Roll|Registration|School|College|Institution|Group|\n|$))',
          r'(?:^|\n)([^\n]+?)\n+\s*(?:Son\s+of|Daughter\s+of|son\s*\/\s*daughter\s+of)',
          r'(?:^|\n)([^\n]+?)\n+\s*(?:Father(?:[\x27\s]*s)?\s*Name|\bS\/O\b|\bD\/O\b)',
        ],
        'fatherName': [
          r'(?:Son|Daughter)\s+of[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:of\s+Institution|Institution|School|College|Roll|Registration|Group|Father\s*CNIC|CNIC|Date|whose|has\s+secured|\]|\n|$))',
          r'son\s*\/\s*daughter\s+of[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:whose|Date|candidate|School|College|Institution|Roll|Registration|Father\s*CNIC|CNIC|Group|as\s+per|\n|$))',
          r'(?:Father(?:[\x27\s]*s)?\s*Name)[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:Father\s*CNIC|CNIC|School|College|Institution|Roll|Registration|Group|Date|DOB|\n|$))',
          r'\b(?:S\/O|D\/O|S\s*\/\s*O|D\s*\/\s*O)\b[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:of\s+Institution|Institution|School|College|Roll|Registration|Group|Father\s*CNIC|CNIC|Date|\n|$))',
        ],
        'rollNo': [
          r'Roll\s*(?:No|Number|Na|Ne|#)?\.?[\s:_]*([0-9]{5,8})',
          r'([0-9]{5,8})\s*(?:\n+[^\n]*Roll|\n+[^\n]*RollNa|\n+[^\n]*Roll\s*Ne)',
          r'\bRoll[\s.:_]+([0-9]{5,8})\b',
          r'\b([0-9]{6})\b',
        ],
        'regNo': [
          r'Registration(?:\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'Enrolm?e?nt(?:\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'Reg(?:\.|\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'([0-9A-Za-z\-]{8,25})\s*(?:\n+[^\n]*Enrolm|\n+[^\n]*Registration|\n+[^\n]*Enrolment|\n+[^\n]*Enrolmemt)',
          r'\b([0-9]{1,3}-[0-9]{1,3}-[0-9]{4,8}-[0-9]{1,3})\b',
          r'\b([0-9]{4,6}-[0-9]{4}-[0-9]{3,5})\b',
          r'\b([0-9]{11,12})\b',
        ],
        'marks': [
          r'(?:Total\s*Marks|Marks\s*Obtained|Obtained\s*Marks|Marks)[^\w\n]*([0-9]{3,4})\s*\/\s*([0-9]{3,4})',
          r'([0-9]{3,4})\s*\/\s*(?:850|1050|1100|1200|550)',
          r'(?:Total\/Over\s*All\s*Grade|TotalOver\s*All\s*Grade|Total)[\s:]*(?:850|1050|1100|1200)\s*([0-9]{3,4})',
          r'TOTAL[^\n\d]*(?:850|1050|1100|1200)\s*([0-9]{3,4})',
          r'(?:Total\s*Marks|Marks\s*Obtained|Obtained\s*Marks|Marks|Total)[^\w\n]*([0-9]{3,4})',
          r'(?:secured|obtained)\s+([0-9]{3,4})\s+marks',
        ],
        'grade': [
          r'GRADE[\s:_]*([A-F©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
          r'(?:Passed\s+with|Status)?[^\w\n]*Grade[\s:_]*([A-F©Â](?:1|2|\s*\+)?|\([A-F](?:1|2|\s*\+)?\)|\[[A-F](?:1|2|\s*\+)?\])(?=\s|\n|$)',
          r'has\s+obtained\s+Grade[\s:_]*([A-F©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
          r'\b([A-F](?:1|2|\s*\+)?)\s+GRADE\b',
        ],
        'group': [
          r'Group[\s:_]*([A-Za-z\s\/-]+?)(?=\s*(?:Attempt|Roll|Registration|Name|Result|BOARD|SECONDARY|INTERMEDIATE|Date|\n|$))',
          r'([A-Za-z\s\/-]+?)\s+Group(?=\s*(?:Result|BOARD|\n|$))',
          r'\b(PRE-MEDICAL|PRE-ENGINEERING|GENERAL\s*SCIENCE|COMPUTER\s*SCIENCE|SCIENCE|HUMANITIES|COMMERCE|ARTS|ICS|FSC|FA|ICOM)\b',
        ],
        'institution': [
          r'(?:of\s+Institution|Institution|candidate\s+from|School\s*:|College\s*:)[\s:_]+([^\n|]+)',
          r'((?:GOVT|GOVERNMENT|PUNJAB|CONCORDIA|ASPIRE|KIPS|SUPERIOR|DIVISIONAL|CADET|GHAZALI|ARMY|MODEL|PILOT|COMMUNITY)[\s\w.,\(\)\/-]+?(?:HIGH\s*SCHOOL|HIGHER\s*SECONDARY\s*SCHOOL|SECONDARY\s*SCHOOL|COLLEGE|CAMPUS|INSTITUTE|ACADEMY|CENTRE|RAWALPINDI|ISLAMABAD|JEHLUM|JHELUM|ATTOCK|CHAKWAL|GUJRANWALA|SIALKOT|GUJRAT)[\s\w.,\/-]*?)(?=\n|has\s+secured|held\s+in|as\s+per|whose|Date|$|\r)',
        ],
        'examMonth': [
          r'Session[\s:]*([A-Za-z0-9\s,-]+?)(?=\s*(?:Marks\s*Sheet|Roll|Group|Name|\n|$))',
          r'month\s+of[\s:_]+([A-Za-z0-9\s,\/-]+?)(?=\s*(?:as\s+a|Registration|held|\n|$))',
          r'(FIRST\s*ANNUAL\s*\d{4}|SECOND\s*ANNUAL\s*\d{4}|ANNUAL,?\s*\d{4}|SUPPLEMENTARY\s*\d{4})',
          r'held\s+in\s+(?:the\s+month\s+of\s+)?([A-Za-z0-9\s,-]+?)(?=\s*(?:Registration|\n|$))',
        ],
        'dob': [
          r'whose\s+date\s+of\s+birth\s+is[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'Date\s*of\s*Birth[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'DOB[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'Birth[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
        ],
        'examType': [
          r'(Marks\s*Sheet\s*SSC)',
          r'(Marks\s*Sheet\s*HSSC)',
          r'(SECONDARY\s*SCHOOL\s*CERTIFICATE\s*EXAMINATION)',
          r'(INTERMEDIATE\s*EXAMINATION)',
        ],
      },
    },
    // >>> [MODULE: BISE_GUJRANWALA_PARSER] - START
    {
      'id': 'bise_gujranwala',
      'name': 'BISE Gujranwala',
      'aliases': ['GUJRANWALA', 'GUJRAN WALA', 'GUJRAN-WALA', 'GRW', 'GUJ'],
      'patterns': {
        'studentName': [
          r'Certified\s+that[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:son\s*\/\s*daughter|son\s+of|daughter\s+of|whose|candidate|has\s+secured|has\s+qualified|held\s+in|\n|$))',
          r'(?:Student(?:[\x27\s]*s)?\s*Name|Candidate(?:[\x27\s]*s)?\s*Name|(?:^|\n)\s*Name)[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:Date\s*of\s*Birth|DOB|Father|Son|Daughter|Roll|Registration|Reg|School|College|Institution|District|Group|\n|$))',
          r'(?:^|\n)([^\n]+?)\n+\s*(?:son\s*\/\s*daughter\s+of|Son\s+of|Daughter\s+of)',
          r'(?:^|\n)([^\n]+?)\n+\s*(?:Father(?:[\x27\s]*s)?\s*Name|\bS\/O\b|\bD\/O\b)',
        ],
        'fatherName': [
          r'son\s*\/\s*daughter\s+of[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:whose|Date|candidate|School|College|Institution|District|Roll|Registration|Father\s*CNIC|CNIC|Group|Bind-Sr|as\s+per|has\s+qualified|\n|$))',
          r'(?:Son|Daughter)\s+of[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:of\s+Institution|Institution|School|College|District|Roll|Registration|Group|Father\s*CNIC|CNIC|Bind-Sr|Date|whose|has\s+secured|\]|\n|$))',
          r'(?:Father(?:[\x27\s]*s)?\s*Name)[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:Father\s*CNIC|CNIC|Bind-Sr|District|School|College|Institution|Roll|Registration|Group|Date|DOB|\n|$))',
          r'\b(?:S\/O|D\/O|S\s*\/\s*O|D\s*\/\s*O)\b[\s:_]+([A-Za-z\s.]+?)(?=\s*(?:of\s+Institution|Institution|School|College|District|Roll|Registration|Group|Father\s*CNIC|CNIC|Bind-Sr|Date|\n|$))',
        ],
        'rollNo': [
          r'\bRoll\s*(?:No|Number|Na|Ne|Mo|#)?\.?[\s:_]*([0-9]{5,8})\b',
          r'(?:^|\n)\s*([0-9]{5,8})\b[^\n]*\n+[^\n]*\bRoll(?:\s*No|\s*Na|\s*Ne|\s*Mo|\b)',
          r'\bRoll(?:\s*No|\s*Na|\s*Ne|\s*Mo|\b)[^\n]*\n+[^\n]*\b([0-9]{5,8})\b',
          r'([0-9]{5,8})\s*(?:\n+[^\n]*Roll|\n+[^\n]*RollNa|\n+[^\n]*Roll\s*Ne|\n+[^\n]*Roll\s*Mo)',
          r'\bRoll[\s.:_]+([0-9]{5,8})\b',
        ],
        'regNo': [
          r'Registration(?:\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'Enrolm?e?n?t?(?:\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'Reg(?:\.|\s*No\.?|\s*Number|\s*#)?[\s:_]*([0-9][0-9A-Za-z\-]+)',
          r'\b(2-[1-9]-[0-9]{6,8}-[0-9]{2})\b',
          r'\b([0-9]{4,6}-[0-9]{4}-[0-9]{3,5})\b',
          r'([0-9A-Za-z\-]{8,25})\s*(?:\n+[^\n]*Enrolm|\n+[^\n]*Registration|\n+[^\n]*Enrolment|\n+[^\n]*Enrolmemt)',
          r'C\.?\s*P\.?[^\w\n]*([0-9\-]+)',
          r'\b([0-9]{1,3}-[0-9]{1,3}-[0-9]{4,8}-[0-9]{1,3})\b',
          r'\b([0-9]{6,8}-[0-9]{6,8}-[0-9]{5,8})\b',
          r'\b([0-9]{10,12})\b',
        ],
        'marks': [
          r'10th[\s:]*([0-9]{3,4})',
          r'12th[\s:]*([0-9]{3,4})',
          r'Notification[\s:_]+([0-9]{3,4})',
          r'(?:Total\/Over\s*All\s*Grade|TotalOver\s*All\s*Grade|Total)[\s:]*(?:850|1050|1100|1200)\s*([0-9]{3,4})',
          r'TOTAL[^\n\d]*(?:850|1050|1100|1200)\s*([0-9]{3,4})',
          r'(?:Total\s*Marks|Marks\s*Obtained|Obtained\s*Marks|Marks)[^\w\n]*([0-9]{3,4})\s*\/\s*([0-9]{3,4})',
          r'([0-9]{3,4})\s*\/\s*(?:850|1050|1100|1200|550)',
          r'(?:Total\s*Marks|Marks\s*Obtained|Obtained\s*Marks|Marks|Total)[^\w\n]*([0-9]{3,4})',
          r'(?:secured|obtained)\s+([0-9]{3,4})\s+marks',
        ],
        'grade': [
          r'has\s+obtained\s+Grade[\s:_]*([A-F©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
          r'Grade[\s:_]*([A-F©Â](?:1|2|\s*\+)?|\([A-F](?:1|2|\s*\+)?\)|\[[A-F](?:1|2|\s*\+)?\])(?=\s|\n|$)',
          r'GRADE[\s:_]*([A-F©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
          r'(?:Passed\s+with|Status)?[^\w\n]*Grade[\s:_]*([A-F©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
          r'\b([A-F](?:1|2|\s*\+)?)\s+GRADE\b',
        ],
        'group': [
          r'Group[\s:_]*([A-Za-z\s\/-]+?)(?=\s*(?:Attempt|Roll|Registration|Reg|Name|Result|BOARD|SECONDARY|INTERMEDIATE|Date|\n|$))',
          r'([A-Za-z\s\/-]+?)\s+Group(?=\s*(?:Result|BOARD|\n|$))',
          r'\b(PRE-MEDICAL|PRE-ENGINEERING|GENERAL\s*SCIENCE|COMPUTER\s*SCIENCE|SCIENCE|GENERAL|HUMANITIES|COMMERCE|ARTS|ICS|FSC|FA|ICOM)\b',
        ],
        'institution': [
          r'candidate\s+from[\s:_]+([^\n|]+?)(?=\s*(?:as\s+per|has\s+obtained|has\s+secured|has\s+qualified|held\s+in|Date|\n|$))',
          r'\b(?:School|College|Institute|Campus)[\s:_]+(?!\s*Certificate\b)([^\n|]+)',
          r'\bDistrict[\s:_]+([^\n|]+)',
          r'(?:of\s+Institution|Institution|candidate\s+from)[\s:_]+(?!\s*Certificate\b)([^\n|]+)',
          r'((?:GOVT|GOVERNMENT|PUNJAB|CONCORDIA|ASPIRE|KIPS|SUPERIOR|DIVISIONAL|CADET|GHAZALI|ARMY|MODEL|PILOT|COMMUNITY|ALLIED)[\s\w.,\(\)\/-]+?(?:HIGH\s*SCHOOL|HIGHER\s*SECONDARY\s*SCHOOL|SECONDARY\s*SCHOOL|COLLEGE|CAMPUS|INSTITUTE|ACADEMY|CENTRE|GUJRANWALA|SIALKOT|GUJRAT|NAROWAL|HAFIZABAD|MANDI\s*BAHA-?UD-?DIN|JEHLUM|JHELUM|RAWALPINDI|ISLAMABAD)[\s\w.,\/-]*?)(?=\n|has\s+secured|held\s+in|as\s+per|whose|Date|$|\r)',
        ],
        'examMonth': [
          r'Session[\s:_]+([A-Za-z0-9\s,-]+?)(?=\s*(?:Marks\s*Sheet|Roll|Group|Name|District|\n|$))',
          r'month\s+of[\s:_]+([A-Za-z0-9\s,\/-]+?)(?=\s*(?:as\s+a|Registration|held|\n|$))',
          r'(FIRST\s*ANNUAL\s*\d{4}|SECOND\s*ANNUAL\s*\d{4}|ANNUAL,?\s*\d{4}|SUPPLEMENTARY\s*\d{4})',
          r'Examination,\s*(\d{4})',
          r'held\s+in\s+(?:the\s+month\s+of\s+)?([A-Za-z0-9\s,-]+?)(?=\s*(?:Registration|\n|$))',
        ],
        'dob': [
          r'whose\s+date\s+of\s+birth\s+is[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'Date\s*of\s*Birth[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'DOB[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
          r'Birth[^\n\d]*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})',
        ],
        'examType': [
          r'(Marks\s*Sheet\s*SSC)',
          r'(Marks\s*Sheet\s*HSSC)',
          r'(SECONDARY\s*SCHOOL\s*CERTIFICATE\s*EXAMINATION)',
          r'(INTERMEDIATE\s*EXAMINATION)',
        ],
      },
    },
    // <<< [MODULE: BISE_GUJRANWALA_PARSER] - END
  ];

  static String cleanPersonName(String raw) {
    var s = raw.split(RegExp(r'\s*(=|DOE|DIATE|SME|ANDSE|EMROARD|EH\s*TERA|INTERMEDIATE|SECONDARY|BOARD)\b', caseSensitive: false)).first;
    s = s
        .replaceAll(
          RegExp(
            r'\b(DOFINTE|DOINTE|DOEN[A-Z]*|ANDSEC|ONDA|TB|AY|Serre|RESULT|CARD|FIRST|ANNUAL|EXAMINATION|BOARD|INTERMEDIATE|SECONDARY|EDUCATION|RAWALPINDI|GUJRANWALA|DOI\s*TE|AME\s*DATE|ANDS\s*EC|ONDAR|CATIONS|PINEMRCARE|TERME|Sy|EDE)\b',
            caseSensitive: false,
          ),
          '',
        )
        .replaceAll(RegExp(r'[^A-Za-z\s.]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    final validShortWords = {'CH', 'DR', 'MR', 'MS', 'MD', 'AL', 'EL', 'JR', 'SR', 'II', 'IV', 'VI'};
    while (RegExp(r'\s+[A-Za-z]{1,2}$').hasMatch(s)) {
      final match = RegExp(r'\s+([A-Za-z]{1,2})$').firstMatch(s);
      final lastWord = match?.group(1)?.toUpperCase() ?? '';
      if (validShortWords.contains(lastWord)) {
        break;
      }
      s = s.replaceAll(RegExp(r'\s+[A-Za-z]{1,2}$'), '').trim();
    }
    return s;
  }

  static String cleanExtractedString(String raw) {
    return raw
        .replaceAll(RegExp(r'[\r\n\t]+'), ' ')
        .replaceAll(RegExp(r'[:|;,\-_~`\x27\|\]\[=]+$'), '')
        .replaceAll(RegExp(r'^[:|;,\-_~`\x27\|\]\[=]+'), '')
        .trim();
  }

  static String normalizeDate(String rawDate) {
    final clean = cleanExtractedString(rawDate).replaceAll(RegExp(r'[/.]'), '-');
    final parts = clean.split('-');
    if (parts.length == 3) {
      final p0 = parts[0].padLeft(2, '0');
      final p1 = parts[1].padLeft(2, '0');
      final p2 = parts[2];
      return '$p0-$p1-$p2';
    }
    return clean;
  }

  static String calculateGradeFromMarks(String obtainedStr, String totalStr) {
    final obt = double.tryParse(obtainedStr);
    final tot = double.tryParse(totalStr);
    if (obt == null || tot == null || tot == 0) return '';
    final pct = (obt / tot) * 100;
    if (pct >= 80) return 'A+';
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    if (pct >= 33) return 'E';
    return 'F';
  }

  static Map<String, String> extractMarksAndGrade(String text, List<String> customMarksPatterns, List<String> customGradePatterns) {
    String? marksObtained;
    String totalMarks = '1100';
    String? grade;

    // Helper to validate realistic Matric/Inter marks score (100 to 1250)
    bool isValidMarks(int m) => m >= 100 && m <= 1250;

    // 1. Check Fraction format: e.g. "504 / 1100", "Total Marks 504 / 1100", "766 / 1100", "504 out of 1100", "504 | 1100"
    final fracMatches = RegExp(
      r'(?:Total\s*Marks|Marks\s*Obtained|Obtained\s*Marks|Marks|Total)?[^\w\n]*([0-9]{3,4})\s*(?:\/|\||\\|\bout\s+of\b|\bof\b|:)\s*([0-9]{3,4})',
      caseSensitive: false,
    ).allMatches(text);

    for (final fracMatch in fracMatches) {
      final val1 = int.tryParse(fracMatch.group(1)!);
      final val2 = int.tryParse(fracMatch.group(2)!);
      if (val1 != null && val2 != null && isValidMarks(val1) && isValidMarks(val2)) {
        if (val1 <= val2 && val2 <= 1300) {
          marksObtained = val1.toString();
          totalMarks = val2.toString();
          break;
        } else if (val2 < val1 && val1 <= 1300) {
          marksObtained = val2.toString();
          totalMarks = val1.toString();
          break;
        }
      }
    }

    // 2. Check explicit "Total/Over All Grade: 1100 559" or "TOTAL 850 597" or "TOTAL 1100 920" format
    if (marksObtained == null) {
      final totalObtMatch = RegExp(
        r'(?:Total\s*[\/]\s*Over\s*All\s*Grade|TotalOver\s*All\s*Grade|TOTAL|Total)[\s:_]*(?:MAX|MAXIMUM)?[\s:_]*(1100|850|1050|1200|550|500|1000)[\s\-_:,]+([0-9]{3,4})',
        caseSensitive: false,
      ).firstMatch(text);

      if (totalObtMatch != null) {
        final t = totalObtMatch.group(1)!;
        final m = int.tryParse(totalObtMatch.group(2)!);
        if (m != null && isValidMarks(m) && m <= int.parse(t)) {
          totalMarks = t;
          marksObtained = m.toString();
        }
      }
    }

    // 3. Check labeled marks (single number): "10th: 559", "12th: 920", "Marks Obtained: 559", "Total Marks: 559"
    if (marksObtained == null) {
      final labeledMatches = RegExp(
        r'(?:10th|12th|Part\s*[-–]?\s*II|Part\s*[-–]?\s*I|SSC\s*[-–]?\s*II|HSSC\s*[-–]?\s*II|Marks\s*Obtained|Obtained\s*Marks|Grand\s*Total|Total\s*Marks|Aggregate)[\s:_]+([0-9]{3,4})',
        caseSensitive: false,
      ).allMatches(text);

      for (final match in labeledMatches) {
        final val = int.tryParse(match.group(1)!);
        if (val != null && isValidMarks(val)) {
          marksObtained = val.toString();
          break;
        }
      }
    }

    // 4. Check custom patterns from templates
    if (marksObtained == null) {
      for (final pattern in customMarksPatterns) {
        final match = RegExp(pattern, caseSensitive: false).firstMatch(text);
        if (match != null && match.groupCount >= 1) {
          final val = int.tryParse(match.group(1)!);
          if (val != null && isValidMarks(val)) {
            marksObtained = val.toString();
            break;
          }
        }
      }
    }

    // 5. Check "secured 504 marks", "obtained 504 marks"
    if (marksObtained == null) {
      final securedMatch = RegExp(
        r'(?:secured|obtained|has\s+secured|has\s+obtained|passed\s+and\s+obtained)[\s:_]+([0-9]{3,4})\s*(?:marks)?',
        caseSensitive: false,
      ).firstMatch(text);

      if (securedMatch != null) {
        final val = int.tryParse(securedMatch.group(1)!);
        if (val != null && isValidMarks(val)) {
          marksObtained = val.toString();
        }
      }
    }

    // 6. English words fallback: e.g. "FIVE HUNDRED NINETY SEVEN"
    if (marksObtained == null || marksObtained.isEmpty) {
      marksObtained = parseEnglishWordsToNumber(text);
    }

    // Determine Total Marks if not set by fraction
    if (totalMarks == '1100') {
      if (RegExp(r'\b(?:TOTAL|MAXIMUM|MAX)[\s:_]*850\b', caseSensitive: false).hasMatch(text) ||
          RegExp(r'\b850\s+[0-9]{3,4}\b').hasMatch(text)) {
        totalMarks = '850';
      } else if (RegExp(r'\b(?:TOTAL|MAXIMUM|MAX)[\s:_]*1050\b', caseSensitive: false).hasMatch(text) ||
          RegExp(r'\b1050\s+[0-9]{3,4}\b').hasMatch(text)) {
        totalMarks = '1050';
      } else if (RegExp(r'\b(?:TOTAL|MAXIMUM|MAX)[\s:_]*1200\b', caseSensitive: false).hasMatch(text) ||
          RegExp(r'\b1200\s+[0-9]{3,4}\b').hasMatch(text)) {
        totalMarks = '1200';
      } else if (RegExp(r'\b(?:TOTAL|MAXIMUM|MAX)[\s:_]*550\b', caseSensitive: false).hasMatch(text) ||
          RegExp(r'\b550\s+[0-9]{3,4}\b').hasMatch(text)) {
        totalMarks = '550';
      }
    }

    // 7. Grade Extraction - comprehensive regexes
    final gradePatterns = [
      ...customGradePatterns,
      r'has\s+(?:passed\s+and\s+)?obtained\s+Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\])(?=\s|\n|$)',
      r'Passed\s+with\s+Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\])(?=\s|\n|$)',
      r'Overall\s*Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\])(?=\s|\n|$)',
      r'Percentile\s*Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\])(?=\s|\n|$)',
      r'Total\s*[\/]\s*Over\s*All\s*Grade[^\n]*?Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\])(?=\s|\n|$)',
      r'Grade[\s:_]*(?:\n\s*)?([A-Fa-f©Â](?:1|2|\s*\+)?|\([A-Fa-f](?:1|2|\s*\+)?\)|\[[A-Fa-f](?:1|2|\s*\+)?\]|\{[A-Fa-f](?:1|2|\s*\+)?\})(?=\s|\n|$)',
      r'GRADE[\s:_]*(?:\n\s*)?([A-Fa-f©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
      r'(?:Passed\s+with|Status)?[^\w\n]*Grade[\s:_]*([A-Fa-f©Â](?:1|2|\s*\+)?)(?=\s|\n|$)',
      r'\bGRADE\s*[:_]?\s*([A-Fa-f](?:1|2|\s*\+)?)\b',
      r'\b([A-Fa-f](?:1|2|\s*\+)?)\s+GRADE\b',
      r'Grade\s*[:_]?\s*[\x27"]?([A-Fa-f](?:1|2|\s*\+)?)[\x27"]?',
    ];

    final validGrades = {'A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E', 'F'};

    for (final pattern in gradePatterns) {
      try {
        final m = RegExp(pattern, caseSensitive: false).firstMatch(text);
        if (m != null && m.groupCount >= 1) {
          var rawG = m.group(1) ?? '';
          rawG = rawG.toUpperCase().replaceAll(RegExp(r'\s+'), '');
          if (rawG.contains('©') || rawG.contains('Â')) rawG = rawG.replaceAll(RegExp(r'[©Â]'), 'C');
          if (rawG == 'A1') rawG = 'A+';
          if (rawG == 'A2') rawG = 'A';
          if (rawG == 'B1') rawG = 'B+';
          if (rawG == 'B2') rawG = 'B';
          if (rawG == 'C1') rawG = 'C+';
          if (rawG == 'C2') rawG = 'C';
          if (rawG == 'D1') rawG = 'D+';
          if (rawG == 'D2') rawG = 'D';
          rawG = rawG.replaceAll(RegExp(r'[^A-F+]'), '');
          if (validGrades.contains(rawG)) {
            grade = rawG;
            break;
          }
        }
      } catch (_) {}
    }

    // 8. Fallback Grade Calculation if missing from scan
    if ((grade == null || grade.isEmpty) && marksObtained != null && marksObtained.isNotEmpty) {
      grade = calculateGradeFromMarks(marksObtained, totalMarks);
    }

    return {
      'marksObtained': marksObtained ?? '',
      'totalMarks': totalMarks,
      'grade': grade ?? '',
    };
  }

  static String? parseEnglishWordsToNumber(String text) {
    final match = RegExp(
      r'obtained\s+marks\s+([A-Za-z\s-]+?)(?:\.|\n|Internal|Grade|Institution|as\s+per|$)',
      caseSensitive: false,
    ).firstMatch(text) ?? RegExp(
      r'\b((?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|THIRTY|FORTY|FIFTY|SIXTY|SEVENTY|EIGHTY|NINETY|HUNDRED|THOUSAND|AND|\s|-)+)\b',
      caseSensitive: false,
    ).firstMatch(text);

    if (match == null) return null;
    final str = match.group(1)!.toUpperCase().replaceAll('-', ' ');
    final ones = {
      'ZERO': 0, 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
      'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
      'ELEVEN': 11, 'TWELVE': 12, 'THIRTEEN': 13, 'FOURTEEN': 14,
      'FIFTEEN': 15, 'SIXTEEN': 16, 'SEVENTEEN': 17, 'EIGHTEEN': 18,
      'NINETEEN': 19, 'TWENTY': 20, 'THIRTY': 30, 'FORTY': 40,
      'FIFTY': 50, 'SIXTY': 60, 'SEVENTY': 70, 'EIGHTY': 80, 'NINETY': 90
    };

    int total = 0;
    int current = 0;
    final tokens = str.split(RegExp(r'\s+'));
    for (final t in tokens) {
      if (ones.containsKey(t)) {
        current += ones[t]!;
      } else if (t == 'HUNDRED') {
        current = (current == 0 ? 1 : current) * 100;
      } else if (t == 'THOUSAND') {
        total += (current == 0 ? 1 : current) * 1000;
        current = 0;
      }
    }
    total += current;
    return total > 0 ? total.toString() : null;
  }

  static String? extractFirstMatch(String text, List<String> regexList) {
    for (final pattern in regexList) {
      try {
        final reg = RegExp(pattern, caseSensitive: false, multiLine: true);
        final match = reg.firstMatch(text);
        if (match != null && match.groupCount >= 1) {
          final val = cleanExtractedString(match.group(1) ?? '');
          if (val.isNotEmpty) return val;
        }
      } catch (_) {}
    }
    return null;
  }

  static String? extractCnic(String text) {
    final cnicRegex = RegExp(r'\b([0-9]{5}-[0-9]{7}-[0-9]{1})\b');
    final match = cnicRegex.firstMatch(text);
    if (match != null) return match.group(1);

    final rawDigitsRegex = RegExp(r'\b([0-9]{13})\b');
    final rawMatch = rawDigitsRegex.firstMatch(text);
    if (rawMatch != null) {
      final s = rawMatch.group(1)!;
      return '${s.substring(0, 5)}-${s.substring(5, 12)}-${s.substring(12, 13)}';
    }
    return null;
  }

  static String? extractContact(String text) {
    final phoneRegex = RegExp(r'(?:\+92|03)[0-9]{2}[-.\s]?[0-9]{7}\b');
    final match = phoneRegex.firstMatch(text);
    return match?.group(0)?.replaceAll(RegExp(r'[\s.-]'), '');
  }

  static Map<String, dynamic> parseDocumentText(String text) {
    final normalized = text.toUpperCase();
    Map<String, dynamic>? selectedBoard;

    for (final template in boardTemplates) {
      final aliases = template['aliases'] as List<String>;
      for (final alias in aliases) {
        if (normalized.contains(alias)) {
          selectedBoard = template;
          break;
        }
      }
      if (selectedBoard != null) break;
    }

    // Heuristic board detection if aliases not found directly:
    if (selectedBoard == null) {
      if (normalized.contains('GUJRAT') ||
          normalized.contains('SIALKOT') ||
          normalized.contains('NAROWAL') ||
          normalized.contains('HAFIZABAD') ||
          normalized.contains('MANDI BAHA') ||
          normalized.contains('MANDI-BAHA') ||
          normalized.contains('PHALIA') ||
          RegExp(r'\b2-[1-9]-[0-9]{6,8}-[0-9]{2}\b').hasMatch(normalized) ||
          RegExp(r'G\s*U\s*J\s*R\s*A\s*N').hasMatch(normalized)) {
        selectedBoard = boardTemplates.firstWhere((b) => b['id'] == 'bise_gujranwala');
      } else {
        selectedBoard = boardTemplates.firstWhere((b) => b['id'] == 'bise_rawalpindi');
      }
    }

    final patterns = (selectedBoard['patterns'] as Map<String, dynamic>?) ?? {};

    // Helper to gather patterns from the selected board plus all universal board fallbacks
    List<String> getCombinedPatterns(String fieldKey) {
      final list = <String>[];
      if (patterns.containsKey(fieldKey)) {
        list.addAll((patterns[fieldKey] as List<String>));
      }
      for (final b in boardTemplates) {
        final bp = b['patterns'] as Map<String, dynamic>?;
        if (bp != null && bp.containsKey(fieldKey)) {
          for (final p in (bp[fieldKey] as List<String>)) {
            if (!list.contains(p)) {
              list.add(p);
            }
          }
        }
      }
      return list;
    }

    // 1. Student Name Extraction
    String studentName = '';
    final rawStudent = extractFirstMatch(text, getCombinedPatterns('studentName'));
    if (rawStudent != null && rawStudent.isNotEmpty) {
      studentName = cleanPersonName(rawStudent);
    }
    if (studentName.isEmpty) {
      final parentMatch = RegExp(
        r'(?:^|\n)([^\n]+?)\n+\s*(?:son\s*\/\s*daughter\s+of|Son\s+of|Daughter\s+of|Father(?:[\x27\s]*s)?\s*Name|\bS\/O\b|\bD\/O\b)',
        caseSensitive: false,
      ).firstMatch(text);
      if (parentMatch != null) {
        final cand = cleanPersonName(parentMatch.group(1) ?? '');
        if (cand.isNotEmpty && cand.length > 2 && !cand.toUpperCase().contains('RESULT CARD')) {
          studentName = cand;
        }
      }
    }

    // 2. Father's Name Extraction
    var fatherName = extractFirstMatch(text, getCombinedPatterns('fatherName'));
    if (fatherName != null) {
      fatherName = cleanPersonName(fatherName);
    }

    // 3. Roll Number Extraction
    final rollNo = extractFirstMatch(text, getCombinedPatterns('rollNo'));

    // 4. Registration / Enrolment Number Extraction
    var regNo = extractFirstMatch(text, getCombinedPatterns('regNo'));
    if (regNo != null && (!RegExp(r'[0-9]').hasMatch(regNo) ||
        regNo.toUpperCase() == 'REGULAR' ||
        regNo.toUpperCase() == 'PRIVATE' ||
        regNo.toUpperCase() == 'ANNUAL' ||
        regNo.toUpperCase() == 'ULAR')) {
      regNo = null;
    }

    // 5. Marks Obtained, Total Marks & Grade Extraction
    final marksAndGrade = extractMarksAndGrade(
      text,
      getCombinedPatterns('marks'),
      getCombinedPatterns('grade'),
    );
    final marksObtained = marksAndGrade['marksObtained'] ?? '';
    final totalMarks = marksAndGrade['totalMarks'] ?? '1100';
    final grade = marksAndGrade['grade'] ?? '';

    // 7. Group Extraction
    var group = extractFirstMatch(text, getCombinedPatterns('group'));
    if (group == null || group.isEmpty || group.length < 3) {
      if (normalized.contains('COMPUTER SCIENCE') && (normalized.contains('PHYSICS') || normalized.contains('MATHEMATICS'))) {
        group = 'SCIENCE (COMPUTER SCIENCE)';
      } else if (normalized.contains('BIOLOGY')) {
        group = 'SCIENCE (PRE-MEDICAL)';
      } else if (normalized.contains('PRE-ENGINEERING') || (normalized.contains('MATHEMATICS') && normalized.contains('CHEMISTRY'))) {
        group = 'SCIENCE (PRE-ENGINEERING)';
      } else if (normalized.contains('GENERAL SCIENCE')) {
        group = 'GENERAL SCIENCE';
      } else if (normalized.contains('SCIENCE')) {
        group = 'SCIENCE';
      } else if (normalized.contains('COMMERCE') || normalized.contains('ACCOUNTING')) {
        group = 'COMMERCE';
      } else if (normalized.contains('HUMANITIES') || normalized.contains('ISLAMIC STUDIES') || normalized.contains('ARTS')) {
        group = 'HUMANITIES';
      } else if (normalized.contains('GENERAL')) {
        group = 'GENERAL';
      }
    }

    // 8. Institution Extraction
    var institution = extractFirstMatch(text, getCombinedPatterns('institution'));
    if (institution != null) {
      institution = institution
          .replaceAll(RegExp(r'^[0-9]+[\s\-_:]*'), '')
          .replaceAll(RegExp(r'^District[\s:_]*', caseSensitive: false), '')
          .trim();
    }

    // 9. Exam Month / Session Extraction
    final examMonth = extractFirstMatch(text, getCombinedPatterns('examMonth'));

    // 10. Date of Birth Extraction
    var dob = extractFirstMatch(text, getCombinedPatterns('dob'));
    if (dob != null && dob.isNotEmpty) {
      dob = normalizeDate(dob);
    }

    // 11. Degree Name Extraction (Differentiate SSC vs HSSC avoiding board name header)
    String degreeName = 'Educational Certificate';
    final contentWithoutHeader = normalized.replaceAll(RegExp(r'BOARD OF INTERMEDIATE (?:AND|&|&AMP;) SECONDARY EDUCATION[^\n]*'), '');

    final isHssc = RegExp(
      r'\b(?:INTERMEDIATE\s*EXAMINATION|HIGHER\s*SECONDARY|HSSC|MARKS\s*SHEET\s*HSSC|11TH|12TH|F\.?\s*SC|I\.?\s*C\.?\s*S|I\.?\s*COM|F\.?\s*A)\b',
      caseSensitive: false,
    ).hasMatch(contentWithoutHeader);

    final isSsc = RegExp(
      r'\b(?:SECONDARY\s*SCHOOL\s*CERTIFICATE|SSC|MARKS\s*SHEET\s*SSC|MATRIC|MATRICULATION|9TH|10TH)\b',
      caseSensitive: false,
    ).hasMatch(contentWithoutHeader);

    if (isHssc && !isSsc) {
      degreeName = 'Intermediate (HSSC)';
    } else if (isSsc && !isHssc) {
      degreeName = 'Matric (SSC)';
    } else if (isHssc && isSsc) {
      // Tie-breaker: Check specific phrases
      if (contentWithoutHeader.contains('HIGHER SECONDARY') || contentWithoutHeader.contains('INTERMEDIATE EXAMINATION') || contentWithoutHeader.contains('HSSC')) {
        degreeName = 'Intermediate (HSSC)';
      } else {
        degreeName = 'Matric (SSC)';
      }
    }

    final cnic = extractCnic(text);
    final contact = extractContact(text);

    return {
      'boardName': selectedBoard['name'] ?? 'BISE Rawalpindi',
      'degreeName': degreeName,
      'fullName': studentName,
      'fatherName': fatherName ?? '',
      'rollNo': rollNo ?? '',
      'registrationNo': regNo ?? '',
      'examMonth': examMonth ?? '',
      'marksObtained': marksObtained,
      'totalMarks': totalMarks,
      'grade': grade,
      'group': group ?? '',
      'institution': institution ?? '',
      'dob': dob ?? '',
      'cnic': cnic ?? '',
      'contact': contact ?? '',
      'rawTextLength': text.length,
    };
  }

  static Process? _daemonProcess;
  static Completer<void>? _daemonReadyCompleter;
  static final Map<String, Completer<String>> _pendingRequests = {};
  static int _reqCounter = 0;

  static Future<void> _ensureDaemonStarted() async {
    if (_daemonProcess != null && _daemonReadyCompleter != null && _daemonReadyCompleter!.isCompleted) {
      return;
    }

    final possibleDaemonPaths = [
      'scripts/ocr_daemon.mjs',
      'D:/academia/scripts/ocr_daemon.mjs',
      '../scripts/ocr_daemon.mjs',
    ];

    String daemonPath = 'scripts/ocr_daemon.mjs';
    for (final p in possibleDaemonPaths) {
      if (File(p).existsSync()) {
        daemonPath = p;
        break;
      }
    }

    _daemonReadyCompleter = Completer<void>();
    try {
      final process = await Process.start('node', [daemonPath]);
      _daemonProcess = process;

      process.stdout.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
        final trimmed = line.trim();
        if (trimmed.isEmpty) return;
        try {
          final json = jsonDecode(trimmed) as Map<String, dynamic>;
          if (json['status'] == 'READY') {
            if (!_daemonReadyCompleter!.isCompleted) {
              _daemonReadyCompleter!.complete();
            }
          } else if (json.containsKey('id')) {
            final id = json['id'].toString();
            final completer = _pendingRequests.remove(id);
            if (completer != null && !completer.isCompleted) {
              if (json['success'] == true) {
                completer.complete((json['text'] as String?) ?? '');
              } else {
                completer.completeError(Exception(json['error'] ?? 'OCR Daemon Error'));
              }
            }
          }
        } catch (_) {}
      });

      process.exitCode.then((code) {
        _daemonProcess = null;
        for (final completer in _pendingRequests.values) {
          if (!completer.isCompleted) {
            completer.completeError(Exception('OCR Daemon exited with code $code'));
          }
        }
        _pendingRequests.clear();
      });

      await _daemonReadyCompleter!.future.timeout(const Duration(seconds: 15), onTimeout: () {
        if (!_daemonReadyCompleter!.isCompleted) {
          _daemonReadyCompleter!.complete();
        }
      });
    } catch (_) {
      _daemonProcess = null;
    }
  }

  static Future<String> executeOcr(String filePath) async {
    // 1. Try high-speed in-memory Daemon first
    try {
      await _ensureDaemonStarted();
      if (_daemonProcess != null) {
        final reqId = 'req_${++_reqCounter}_${DateTime.now().millisecondsSinceEpoch}';
        final completer = Completer<String>();
        _pendingRequests[reqId] = completer;

        _daemonProcess!.stdin.writeln(jsonEncode({
          'id': reqId,
          'path': filePath,
        }));

        final text = await completer.future.timeout(const Duration(seconds: 10));
        return text;
      }
    } catch (_) {
      // Daemon failed or timed out, fallback seamlessly to CLI runner
    }

    // 2. Reliable Fallback: One-shot CLI runner
    final possibleRunnerPaths = [
      'scripts/ocr_runner.mjs',
      'D:/academia/scripts/ocr_runner.mjs',
      '../scripts/ocr_runner.mjs',
    ];

    String runnerPath = 'scripts/ocr_runner.mjs';
    for (final p in possibleRunnerPaths) {
      if (File(p).existsSync()) {
        runnerPath = p;
        break;
      }
    }

    final result = await Process.run('node', [runnerPath, filePath]);
    if (result.exitCode != 0) {
      final err = result.stderr.toString().trim();
      throw Exception(err.isNotEmpty ? err : 'OCR process exited with code ${result.exitCode}');
    }
    return result.stdout.toString();
  }

  static Future<Map<String, dynamic>> processDocumentBytes(List<int> bytes, String fileName) async {
    final tempDir = Directory.systemTemp;
    final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'jpg';
    final tempFile = File('${tempDir.path}${Platform.pathSeparator}ocr_${DateTime.now().millisecondsSinceEpoch}.$ext');

    try {
      await tempFile.writeAsBytes(bytes);
      final rawOcrText = await executeOcr(tempFile.path);
      return parseDocumentText(rawOcrText);
    } finally {
      if (await tempFile.exists()) {
        try {
          await tempFile.delete();
        } catch (_) {}
      }
    }
  }

  static Future<void> handleOcrScanRequest(
    HttpRequest request,
    Future<void> Function(HttpRequest, int, Map<String, Object?>) sendJsonResponse,
  ) async {
    if (request.method != 'POST') {
      await sendJsonResponse(request, HttpStatus.methodNotAllowed, {
        'success': false,
        'error': 'Method not allowed. Use POST.',
      });
      return;
    }

    try {
      final content = await utf8.decoder.bind(request).join();
      if (content.trim().isEmpty) {
        await sendJsonResponse(request, HttpStatus.badRequest, {
          'success': false,
          'error': 'Empty request body.',
        });
        return;
      }

      final body = jsonDecode(content) as Map<String, dynamic>;

      // 1. Direct text extraction mode
      final directText = (body['text'] as String?) ?? '';
      if (directText.trim().isNotEmpty) {
        final parsedData = parseDocumentText(directText);
        await sendJsonResponse(request, HttpStatus.ok, {
          'success': true,
          'data': parsedData,
        });
        return;
      }

      // 2. Direct file upload / Base64 file mode
      final fileData = (body['fileData'] as String?) ?? (body['file'] as String?) ?? '';
      final fileName = (body['fileName'] as String?) ?? (body['name'] as String?) ?? 'document.jpg';

      if (fileData.trim().isEmpty) {
        await sendJsonResponse(request, HttpStatus.badRequest, {
          'success': false,
          'error': 'No file data or text provided for OCR scanning.',
        });
        return;
      }

      // Strip data URI prefix if present (e.g. data:image/jpeg;base64,...)
      String cleanBase64 = fileData;
      if (cleanBase64.contains(',')) {
        cleanBase64 = cleanBase64.split(',').last;
      }

      final bytes = base64Decode(cleanBase64.replaceAll(RegExp(r'\s+'), ''));
      final parsedData = await processDocumentBytes(bytes, fileName);

      await sendJsonResponse(request, HttpStatus.ok, {
        'success': true,
        'data': parsedData,
      });
    } catch (e) {
      await sendJsonResponse(request, HttpStatus.badRequest, {
        'success': false,
        'error': 'Failed to process document OCR: $e',
      });
    }
  }
}
