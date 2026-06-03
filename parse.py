import json
import re

flag_map = {
    'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
    'Canada': 'ca', 'Bosnia and Herzegovina': 'ba', 'USA': 'us', 'Paraguay': 'py',
    'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br', 'Morocco': 'ma',
    'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au', 'Türkiye': 'tr',
    'Germany': 'de', 'Curaçao': 'cw', 'Netherlands': 'nl', 'Japan': 'jp',
    'Ivory Coast': 'ci', 'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn',
    'Spain': 'es', 'Cape Verde': 'cv', 'Belgium': 'be', 'Egypt': 'eg',
    'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'Iran': 'ir', 'New Zealand': 'nz',
    'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
    'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
    'Portugal': 'pt', 'Congo DR': 'cd', 'England': 'gb-eng', 'Croatia': 'hr',
    'Ghana': 'gh', 'Panama': 'pa', 'Uzbekistan': 'uz', 'Colombia': 'co',
    'TBC': 'xx'
}

def get_flag(team):
    if "Runner-up" in team or "Winner" in team or "3rd Best" in team:
        return 'xx'
    if team in flag_map:
        return flag_map[team]
    return 'xx'

def parse_matches():
    matches = []
    current_round = ""
    with open('matches.txt', 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("Round") or line.startswith("Quarter-Finals") or line.startswith("Semi-Finals") or line.startswith("Finals"):
                current_round = line
            elif line.startswith("- "):
                # Parse match line: - 12 Jun 2026 | 02:00 WIB | Mexico vs South Africa | Estadio...
                parts = line[2:].split(' | ')
                if len(parts) >= 3:
                    date = parts[0].replace(' 2026', '').strip()
                    time = parts[1].replace(' WIB', '').strip()
                    teams = parts[2].split(' vs ')
                    if len(teams) == 2:
                        teamA = teams[0].strip()
                        teamB = teams[1].strip()
                        
                        # Fix for multi-line split if any
                        # Sometimes venue gets split onto next line, but we don't care about venue for the JSON
                        matches.append({
                            'id': f"m{len(matches)+1}",
                            'round': current_round,
                            'date': f"{date} 2026",
                            'time': time,
                            'teamA': teamA,
                            'codeA': get_flag(teamA),
                            'teamB': teamB,
                            'codeB': get_flag(teamB)
                        })
    
    with open('matches_data.json', 'w') as f:
        json.dump(matches, f, indent=4)

if __name__ == "__main__":
    parse_matches()
