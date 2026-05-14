-- =====================================================================
-- Seed: surahs (Al-Fatihah + Juz Amma), duas (daily + namaz), subjects, settings.
-- Run AFTER 01_schema.sql.
-- =====================================================================

insert into public.subjects (code, name, module_type) values
    ('QURAN','Quran Recitation','quran_recitation'),
    ('HIFZ','Memorisation (Hifz)','memorisation'),
    ('DUAD','Daily Duas','daily_duas'),
    ('DUAN','Namaz Duas','namaz_duas'),
    ('AKHL','Akhlaq & Adab','general'),
    ('ARAB','Arabic Language','general')
on conflict (code) do nothing;

insert into public.settings (id, school_name) values (1, 'My Madrasa')
on conflict (id) do nothing;

insert into public.surahs (number, name_arabic, name_transliteration, name_english, total_ayahs, juz_start) values
    (1,  'الفاتحة',   'Al-Fatihah',     'The Opening',           7,  1),
    (78, 'النبأ',     'An-Naba',        'The Announcement',     40, 30),
    (79, 'النازعات',  'An-Naziat',      'Those Who Pull Out',   46, 30),
    (80, 'عبس',       'Abasa',          'He Frowned',           42, 30),
    (81, 'التكوير',   'At-Takwir',      'The Folding Up',       29, 30),
    (82, 'الانفطار',  'Al-Infitar',     'The Cleaving',         19, 30),
    (83, 'المطففين',  'Al-Mutaffifin',  'Defrauding',           36, 30),
    (84, 'الانشقاق',  'Al-Inshiqaq',    'The Splitting Asunder',25, 30),
    (85, 'البروج',    'Al-Buruj',       'The Constellations',   22, 30),
    (86, 'الطارق',    'At-Tariq',       'The Night-Comer',      17, 30),
    (87, 'الأعلى',    'Al-Ala',         'The Most High',        19, 30),
    (88, 'الغاشية',   'Al-Ghashiyah',   'The Overwhelming',     26, 30),
    (89, 'الفجر',     'Al-Fajr',        'The Dawn',             30, 30),
    (90, 'البلد',     'Al-Balad',       'The City',             20, 30),
    (91, 'الشمس',     'Ash-Shams',      'The Sun',              15, 30),
    (92, 'الليل',     'Al-Layl',        'The Night',            21, 30),
    (93, 'الضحى',     'Ad-Duha',        'The Forenoon',         11, 30),
    (94, 'الشرح',     'Ash-Sharh',      'The Opening Forth',     8, 30),
    (95, 'التين',     'At-Tin',         'The Fig',               8, 30),
    (96, 'العلق',     'Al-Alaq',        'The Clot',             19, 30),
    (97, 'القدر',     'Al-Qadr',        'The Night of Decree',   5, 30),
    (98, 'البينة',    'Al-Bayyinah',    'The Clear Evidence',    8, 30),
    (99, 'الزلزلة',   'Az-Zalzalah',    'The Earthquake',        8, 30),
    (100,'العاديات',  'Al-Adiyat',      'The Courser',          11, 30),
    (101,'القارعة',   'Al-Qariah',      'The Striking Hour',    11, 30),
    (102,'التكاثر',   'At-Takathur',    'The Piling Up',         8, 30),
    (103,'العصر',     'Al-Asr',         'The Time',              3, 30),
    (104,'الهمزة',    'Al-Humazah',     'The Slanderer',         9, 30),
    (105,'الفيل',     'Al-Fil',         'The Elephant',          5, 30),
    (106,'قريش',      'Quraysh',        'Quraysh',               4, 30),
    (107,'الماعون',   'Al-Maun',        'The Small Kindness',    7, 30),
    (108,'الكوثر',    'Al-Kawthar',     'Abundance',             3, 30),
    (109,'الكافرون',  'Al-Kafirun',     'The Disbelievers',      6, 30),
    (110,'النصر',     'An-Nasr',        'The Help',              3, 30),
    (111,'المسد',     'Al-Masad',       'The Palm Fibre',        5, 30),
    (112,'الإخلاص',   'Al-Ikhlas',      'Sincerity',             4, 30),
    (113,'الفلق',     'Al-Falaq',       'The Daybreak',          5, 30),
    (114,'الناس',     'An-Nas',         'Mankind',               6, 30)
on conflict (number) do nothing;

insert into public.duas (category, title, arabic_text, transliteration, translation, sort_order) values
    ('daily','Before Eating',    'بِسْمِ اللَّهِ',                                 'Bismillah',                              'In the name of Allah',                                      1),
    ('daily','After Eating',     'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا','Alhamdulillah-illadhi at''amana wa saqana','Praise be to Allah who fed us and gave us drink',          2),
    ('daily','Before Sleep',     'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',         'Bismika Allahumma amutu wa ahya',        'In Your name O Allah, I die and I live',                    3),
    ('daily','Waking Up',        'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا',            'Alhamdulillah-illadhi ahyana',           'Praise be to Allah who gave us life',                       4),
    ('daily','Entering Bathroom','اللَّهُمَّ إِنِّي أَعُوذُ بِكَ',                  'Allahumma inni a''udhu bika',            'O Allah, I seek refuge in You',                             5),
    ('daily','Leaving Home',     'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ',        'Bismillahi tawakkaltu ''ala-llah',       'In the name of Allah, I trust in Allah',                    6),
    ('namaz','Niyyah (Intention)','نَوَيْتُ',                                       'Nawaytu',                                'I intend...',                                                7),
    ('namaz','Takbir',           'اللَّهُ أَكْبَرُ',                                'Allahu Akbar',                           'Allah is the Greatest',                                     8),
    ('namaz','Thana (Subhanaka)','سُبْحَانَكَ اللَّهُمَّ',                          'Subhanaka Allahumma',                    'Glory be to You, O Allah',                                  9),
    ('namaz','Ruku Tasbeeh',     'سُبْحَانَ رَبِّيَ الْعَظِيمِ',                     'Subhana Rabbiyal Adheem',                'Glory be to my Lord, the Most Great',                       10),
    ('namaz','Sajdah Tasbeeh',   'سُبْحَانَ رَبِّيَ الْأَعْلَى',                     'Subhana Rabbiyal A''la',                 'Glory be to my Lord, the Most High',                        11),
    ('namaz','Tashahhud',        'التَّحِيَّاتُ لِلَّهِ',                            'At-tahiyyatu lillah',                    'All greetings are for Allah',                              12),
    ('namaz','Durood Ibrahim',   'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',                  'Allahumma salli ''ala Muhammad',         'O Allah, send blessings upon Muhammad',                    13),
    ('namaz','Dua after Tashahhud','اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي',              'Allahumma inni dhalamtu nafsi',          'O Allah, I have wronged myself',                           14),
    ('namaz','Salam',            'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',         'As-salamu ''alaykum wa rahmatullah',     'Peace and mercy of Allah be upon you',                     15);
