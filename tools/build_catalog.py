"""Build MyWorkout's exercise catalogue from free-exercise-db (public domain).

Usage: python3 -I build_catalog.py <fedb_dir> <body.json> <out_app_dir>
"""
import json, os, re, subprocess, sys

FEDB, BODY, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(os.path.join(FEDB, 'dist/exercises.json')))
by_name = {e['name']: e for e in data}

BAR = {  # pull-up bar
    'Chin-Up', 'Pullups', 'V-Bar Pullup', 'Wide-Grip Rear Pull-Up', 'Hanging Leg Raise',
    'Hanging Pike', 'Gorilla Chin/Crunch', 'Mixed Grip Chin', 'Muscle Up', 'Kipping Muscle Up',
    'One Arm Chin-Up', 'One Handed Hang', 'Scapular Pull-Up', 'Side To Side Chins',
    'Gironda Sternum Chins', 'Weighted Pull Ups',
}
# Never available: decline bench, preacher bench, balls, machines, racks, bands, parallel bars.
NEVER = re.compile(r'decline|preacher|exercise ball|bosu|machine|smith|chains|band|box jump', re.I)
BODY_EXCLUDE = {'Dips - Triceps Version', 'Body Tricep Press', 'Crunch - Legs On Exercise Ball'}
EZ_KEEP = {'EZ-Bar Curl', 'EZ-Bar Skullcrusher', 'Close-Grip EZ-Bar Press', 'Lying Triceps Press',
           'Lying Close-Grip Barbell Triceps Press To Chin', 'Spider Curl'}
# Barbell movements that work fine with an EZ bar (no rack needed).
EZ_FROM_BARBELL = {
    'Barbell Ab Rollout - On Knees', 'Close-Grip EZ Bar Curl', 'Close-Grip Standing Barbell Curl',
    'Drag Curl', 'Reverse Barbell Curl', 'Wide-Grip Standing Barbell Curl', 'Bent Over Barbell Row',
    'Reverse Grip Bent-Over Rows', 'Upright Barbell Row', 'Barbell Shrug', 'Standing Military Press',
    'Standing Overhead Barbell Triceps Extension', 'Romanian Deadlift',
    'Stiff-Legged Barbell Deadlift', 'Stiff Leg Barbell Good Morning', 'Barbell Lunge',
    'Barbell Walking Lunge', 'Standing Front Barbell Raise Over Head', 'Standing Barbell Calf Raise',
    'Barbell Side Bend', 'Barbell Rear Delt Row', 'Barbell Deadlift',
    # with the flat / incline bench
    'Lying Close-Grip Barbell Triceps Extension Behind The Head', 'Incline Barbell Triceps Extension',
    'Seated Close-Grip Concentration Barbell Curl', 'Seated Palm-Up Barbell Wrist Curl',
    'Seated Palms-Down Barbell Wrist Curl', 'Palms-Down Wrist Curl Over A Bench',
    'Palms-Up Barbell Wrist Curl Over A Bench', 'Barbell Curls Lying Against An Incline',
    'Bent-Arm Barbell Pullover', 'Barbell Step Ups', 'Incline Bench Pull',
}
BENCH = re.compile(r'bench|incline|seated|lying|prone|step.?up|pullover|skullcrusher|tate press|'
                   r'spider curl|concentration|dumbbell flyes|head on bench|one-arm dumbbell row|'
                   r'butt lift|hip raise|hyperextension|dips', re.I)
FLOOR_OK = {'corpo', 'sbarra'}  # bodyweight names with "seated"/"lying" are floor stretches/crunches

ZONE = {
    'abdominals': 'abs', 'abductors': 'gluteal', 'adductors': 'adductors', 'biceps': 'biceps',
    'calves': 'calves', 'chest': 'chest', 'forearms': 'forearm', 'glutes': 'gluteal',
    'hamstrings': 'hamstring', 'lats': 'upper-back', 'middle back': 'upper-back',
    'lower back': 'lower-back', 'neck': None, 'quadriceps': 'quadriceps', 'shoulders': 'deltoids',
    'traps': 'trapezius', 'triceps': 'triceps',
}
OBLIQUE = re.compile(r'oblique|twist|side bend|side bridge|wood chop|cable lift|pallof|jackknife|'
                     r'wipers|heel touch|cross-body|elbow to knee|side to side|judo', re.I)

picked = []
for e in data:
    eq, n = e['equipment'], e['name']
    if NEVER.search(n):
        continue
    if n in BAR:
        tag = 'sbarra'
    elif eq == 'body only' and n not in BODY_EXCLUDE:
        tag = 'corpo'
    elif eq == 'e-z curl bar' and n in EZ_KEEP:
        tag = 'ezbar'
    elif eq == 'barbell' and n in EZ_FROM_BARBELL:
        tag = 'ezbar'
    elif eq == 'dumbbell':
        tag = 'manubri'
    elif eq == 'cable':
        tag = 'pulley'
    else:
        continue
    if tag in FLOOR_OK:
        bench = bool(re.search(r'bench|step-up|dips', n, re.I))
    else:
        bench = bool(BENCH.search(n))
    picked.append((tag, bench, e))

missing = (BAR | EZ_FROM_BARBELL | EZ_KEEP) - {e['name'] for _, _, e in picked}
assert not missing, missing

def zones(lst):
    out = []
    for m in lst:
        z = ZONE[m]
        if z and z not in out:
            out.append(z)
    return out

img_dir = os.path.join(OUT, 'img')
os.makedirs(img_dir, exist_ok=True)
catalog = []
for tag, bench, e in picked:
    name = e['name']
    if tag == 'ezbar':
        name = name.replace('Barbell', 'EZ-Bar').replace('EZ Bar', 'EZ-Bar')
    p, s = zones(e['primaryMuscles']), zones(e['secondaryMuscles'])
    if OBLIQUE.search(e['name']):
        p = ['obliques'] + [z for z in p if z != 'obliques']
    s = [z for z in s if z not in p]
    slug = re.sub(r'[^a-z0-9]+', '-', e['id'].lower()).strip('-')
    frames = []
    for i, rel in enumerate(e['images'][:2]):
        src = os.path.join(FEDB, 'exercises', rel)
        dst = f'{slug}-{i}.webp'
        if not os.path.exists(os.path.join(img_dir, dst)):
            subprocess.run(['cwebp', '-quiet', '-q', '62', '-resize', '420', '0', src,
                            '-o', os.path.join(img_dir, dst)], check=True)
        frames.append('img/' + dst)
    catalog.append({
        'id': slug, 'n': name, 'eq': tag, 'b': int(bench), 'cat': e['category'], 'lvl': e['level'],
        'p': p, 's': s, 'img': frames, 'ins': e['instructions'],
    })

catalog.sort(key=lambda x: x['n'].lower())
ids = [c['id'] for c in catalog]
assert len(ids) == len(set(ids))

body = json.load(open(BODY))
with open(os.path.join(OUT, 'data.js'), 'w') as f:
    f.write('// Generated by build_catalog.py. Exercises: free-exercise-db (public domain).\n')
    f.write('// Body outlines: MuscleMap by Melih Colpan (MIT), see LICENSES.md.\n')
    f.write('window.CATALOG=' + json.dumps(catalog, separators=(',', ':'), ensure_ascii=False) + ';\n')
    f.write('window.BODY=' + json.dumps(body, separators=(',', ':')) + ';\n')

from collections import Counter
print(len(catalog), Counter(c['eq'] for c in catalog), 'bench', sum(c['b'] for c in catalog), Counter(c['cat'] for c in catalog))
print('zones with no primary exercise:',
      {'chest','deltoids','biceps','triceps','forearm','abs','obliques','trapezius','upper-back',
       'lower-back','gluteal','quadriceps','hamstring','adductors','calves'} - {z for c in catalog for z in c['p']})
