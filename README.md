# site_sport_nomade

## Structure de la BDD : 

### users :
id | name

### exercices :
id | creator_id | shared | tracking

### sessions :
id | name

## Structure de tracking :

{
  "user_id": [
    {"session_id" : S-002, "reps": 10, "weight": 60 },
    {"session_id" : S-003, "reps": 8, "weight": 65 }
  ]
}
