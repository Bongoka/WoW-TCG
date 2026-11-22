# Baut die Deck-Bibliothek (JSON im Format des "Wiederherstellen"-Buttons).
# Aufruf:  powershell -NoProfile -ExecutionPolicy Bypass -File tools/build_deck_library.ps1
# Ergebnis: docs/deck_library_all.json, docs/deck_library_rainbow.json, docs/deck_library_meta10.json

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'docs'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ---------------------------------------------------------------- Bausteine
$Q15 = @{ 344 = 4; 5263 = 4; 345 = 3; 2240 = 2; 343 = 2 }                       # 15 Ressourcen-Quests
$Q12 = @{ 2240 = 4; 4301 = 4; 4305 = 4 }                                          # 12 Draw-Quests
$C26 = @{ 246 = 4; 4177 = 4; 266 = 3; 5206 = 4; 239 = 3; 227 = 4; 5157 = 2; 4175 = 2 }   # 26 Bodies
$B32 = @{ 246 = 4; 4177 = 4; 266 = 3; 5206 = 4; 239 = 4; 227 = 4; 5157 = 3; 4195 = 2; 1213 = 4 } # 32 Bodies
$A28 = @{ 2157 = 4; 246 = 4; 4177 = 4; 266 = 3; 5206 = 4; 239 = 3; 227 = 4; 4195 = 2 }   # 28 Aggro-Bodies

function Merge {
    param([hashtable]$a, [hashtable]$b)
    $r = @{}
    foreach ($k in $a.Keys) { $r[[int]$k] = [int]$a[$k] }
    foreach ($k in $b.Keys) {
        $ik = [int]$k
        if ($r.ContainsKey($ik)) { $r[$ik] = $r[$ik] + [int]$b[$k] } else { $r[$ik] = [int]$b[$k] }
    }
    return $r
}
function Merge3 { param([hashtable]$a, [hashtable]$b, [hashtable]$c) return (Merge (Merge $a $b) $c) }
function Merge4 { param([hashtable]$a, [hashtable]$b, [hashtable]$c, [hashtable]$d) return (Merge (Merge3 $a $b $c) $d) }

$heroClass = @{
    4016 = 'Druid'; 16 = 'Druid'; 1017 = 'Druid'; 2010 = 'Druid'
    2016 = 'Hunter'; 14 = 'Hunter'; 1011 = 'Hunter'
    15 = 'Mage'; 2011 = 'Mage'; 1016 = 'Mage'
    2015 = 'Paladin'; 4014 = 'Paladin'; 1010 = 'Paladin'
    12 = 'Priest'; 5025 = 'Priest'; 2017 = 'Priest'; 4012 = 'Priest'
    1013 = 'Rogue'; 2018 = 'Rogue'; 4018 = 'Rogue'; 11 = 'Rogue'
    10 = 'Shaman'; 1014 = 'Shaman'; 5020 = 'Shaman'; 2014 = 'Shaman'
    1018 = 'Warlock'; 13 = 'Warlock'; 2012 = 'Warlock'
    9 = 'Warrior'; 1012 = 'Warrior'; 2013 = 'Warrior'
}

$script:decks = @()
function AddDeck {
    param([string]$id, [string]$name, [int]$hero, [hashtable]$spec, [string]$group)
    $cards = New-Object System.Collections.Generic.List[int]
    foreach ($k in ($spec.Keys | Sort-Object)) {
        for ($i = 0; $i -lt [int]$spec[$k]; $i++) { $cards.Add([int]$k) }
    }
    $script:decks += [ordered]@{
        id      = $id
        name    = $name
        hero    = $hero
        faction = 'Horde'
        class   = $heroClass[$hero]
        group   = $group
        cards   = $cards.ToArray()
    }
}

# ---------------------------------------------------------------- Meta-10 (unverändert)
AddDeck 'custom_class_druid'   'Druid (Control)'   4016 (Merge3 @{2240=4;4301=4;4305=4;1030=4;4022=4;27=4;171=4} @{246=4;4177=4;266=3;5206=4;239=4;227=4;5157=3} @{4195=2;1213=4}) 'meta10'
AddDeck 'custom_class_hunter'  'Hunter (Control)'  2016 (Merge3 @{2240=4;4301=4;4305=4;1040=4;41=3;33=4;171=4;2109=1} @{246=4;4177=4;266=3;5206=4;239=4;227=4;5157=3} @{4195=2;1213=4}) 'meta10'
AddDeck 'custom_class_paladin' 'Paladin (Control)' 2015 (Merge3 @{2240=4;4301=4;4305=4;68=4;2050=4;1062=3;171=4;2109=1} @{246=4;4177=4;266=3;5206=4;239=4;227=4;5157=3} @{4195=2;1213=4}) 'meta10'
AddDeck 'custom_class_priest'  'Priest (Marka)'    12   (Merge4 $Q15 $C26 @{1076=2;1078=4;2061=2;88=2;4068=2;5077=1;5085=2} @{4195=4}) 'meta10'
AddDeck 'custom_class_rogue'   'Rogue (Control)'   1013 (Merge3 @{2240=4;4301=4;4305=4;1085=4;171=4;93=4;99=2;2109=1;1082=1} @{246=4;4177=4;266=3;5206=4;239=4;227=4;5157=3} @{4195=2;1213=4}) 'meta10'
AddDeck 'custom_class_shaman'  'Shaman (Control)'  10   (Merge3 @{2240=4;4301=4;4305=4;5103=4;113=4;109=2;2076=2;171=3;2109=1} @{246=4;4177=4;266=3;5206=4;239=4;227=4;5157=3} @{4186=4;260=2}) 'meta10'
AddDeck 'custom_class_warrior' 'Warrior'           9    (Merge3 $Q15 $C26 @{137=1;141=1;142=3;257=2;1121=2;145=3;312=1;2166=2;3125=1;338=2;1116=1}) 'meta10'
AddDeck 'custom_class_warlock' 'Warlock (Control)' 1018 (Merge3 @{4301=4;4305=4;2240=4;5206=4;239=4;227=4;5157=3} @{5111=3;4186=3;4113=3;134=4;132=4;1114=3} @{2083=2;128=3;2086=4;171=3;2109=1}) 'meta10'
AddDeck 'custom_warlock_control' 'Warlock Midrange (Marka)' 1018 (Merge4 $Q15 $C26 @{132=3;134=4;2086=4;4301=4} @{4195=4}) 'meta10'
AddDeck 'custom_test_v2'       'test v2'           15   (Merge3 @{246=4;4177=4;266=3;5206=4;239=3;227=4;5157=4;4175=2;4195=2} @{1046=4;52=4;1053=3;58=2;53=2} $Q15) 'meta10'

# ---------------------------------------------------------------- Regenbogen: 9 Klassen x 3 Talente
# Jede Klasse: Aggro / Midrange (Ausrüstung) / Control. Talentkarten sind eingestreut.

# --- Druid
AddDeck 'rb_druid_feral_aggro' 'Druid · Feral · Aggro' 16 (Merge3 $Q15 $A28 @{2027=4;1026=4;1021=3;17=3;29=2;171=1}) 'rainbow'
AddDeck 'rb_druid_balance_mid' 'Druid · Balance · Mid' 1017 (Merge4 $Q15 $C26 @{322=3;329=2;327=2;2206=2;2201=2;5218=1;1260=1;4272=1} @{1023=2;4020=1;1030=2}) 'rainbow'
AddDeck 'rb_druid_resto_ctrl' 'Druid · Restoration · Control' 2010 (Merge3 $Q12 @{1030=4;4022=4;27=4;171=4} $B32) 'rainbow'

# --- Hunter
AddDeck 'rb_hunter_mm_aggro' 'Hunter · Marksmanship · Aggro' 2016 (Merge3 $Q15 $A28 @{32=4;33=4;1042=4;4034=3;2035=1;2109=1}) 'rainbow'
AddDeck 'rb_hunter_bm_mid' 'Hunter · Beast Mastery · Mid' 14 (Merge4 $Q15 $C26 @{312=3;1280=3;3119=2;4291=2;5232=2;2204=2} @{35=2;1039=2;33=1}) 'rainbow'
AddDeck 'rb_hunter_surv_ctrl' 'Hunter · Survival · Control' 1011 (Merge3 $Q12 @{1040=4;41=3;33=4;4041=2;171=3} $B32) 'rainbow'

# --- Mage
AddDeck 'rb_mage_fire_aggro' 'Mage · Fire · Aggro' 15 (Merge3 $Q15 $A28 @{1053=4;52=4;1046=3;2039=3;4046=2;2109=1}) 'rainbow'
AddDeck 'rb_mage_arcane_mid' 'Mage · Arcane · Mid' 2011 (Merge4 $Q15 $C26 @{322=3;329=2;2220=2;327=2;4292=2;5217=2;1251=1} @{1044=2;5057=2;1053=1}) 'rainbow'
AddDeck 'rb_mage_frost_ctrl' 'Mage · Frost · Control' 1016 (Merge3 $Q12 @{1053=2;52=4;56=4;50=2;171=3;2109=1} $B32) 'rainbow'

# --- Paladin
AddDeck 'rb_paladin_ret_aggro' 'Paladin · Retribution · Aggro' 4014 (Merge3 $Q15 $A28 @{1058=4;68=4;2050=3;1063=3;5071=2;2109=1}) 'rainbow'
AddDeck 'rb_paladin_prot_mid' 'Paladin · Protection · Mid' 2015 (Merge4 $Q15 $C26 @{312=3;1280=3;3119=2;1286=2;1257=2;4260=2} @{70=2;2046=2;68=1}) 'rainbow'
AddDeck 'rb_paladin_holy_ctrl' 'Paladin · Holy · Control' 1010 (Merge3 $Q12 @{68=3;2048=1;2050=4;1062=3;171=4;2109=1} $B32) 'rainbow'

# --- Priest
AddDeck 'rb_priest_shadow_aggro' 'Priest · Shadow · Aggro' 5025 (Merge3 $Q15 $A28 @{4077=4;76=4;82=3;2061=3;88=2;2109=1}) 'rainbow'
AddDeck 'rb_priest_disc_mid' 'Priest · Discipline · Mid' 2017 (Merge4 $Q15 $C26 @{322=3;329=2;2218=2;327=2;4292=2;3105=2;4255=1} @{1072=2;2060=2;76=1}) 'rainbow'
AddDeck 'rb_priest_holy_ctrl' 'Priest · Holy · Control' 4012 (Merge3 $Q12 @{1078=4;76=3;90=1;4068=4;171=3;2109=1} $B32) 'rainbow'

# --- Rogue
AddDeck 'rb_rogue_assn_aggro' 'Rogue · Assassination · Aggro' 2018 (Merge3 $Q15 $A28 @{92=4;2070=4;99=3;1087=3;171=2;2109=1}) 'rainbow'
AddDeck 'rb_rogue_combat_mid' 'Rogue · Combat · Mid' 4018 (Merge4 $Q15 $C26 @{4275=3;4293=3;315=2;1280=2;3119=2;5218=2} @{2072=2;1080=2;5087=1}) 'rainbow'
AddDeck 'rb_rogue_sub_ctrl' 'Rogue · Subtlety · Control' 11 (Merge3 $Q12 @{1085=4;171=4;93=4;99=2;1083=1;2109=1} $B32) 'rainbow'

# --- Shaman
AddDeck 'rb_shaman_enh_aggro' 'Shaman · Enhancement · Aggro' 1014 (Merge4 $Q15 $A28 @{312=3;2221=3;4275=2;1286=1;4272=1} @{1101=3;5101=2;115=1;119=1}) 'rainbow'
AddDeck 'rb_shaman_elem_mid' 'Shaman · Elemental · Mid' 5020 (Merge4 $Q15 $C26 @{322=3;329=2;2220=2;327=2;4272=2;5232=2;294=1} @{4101=2;108=2;113=1}) 'rainbow'
AddDeck 'rb_shaman_resto_ctrl' 'Shaman · Restoration · Control' 2014 (Merge3 $Q12 @{5103=4;113=4;109=2;2076=2;2075=1;171=2;2109=1} $B32) 'rainbow'

# --- Warlock
AddDeck 'rb_warlock_destr_aggro' 'Warlock · Destruction · Aggro' 1018 (Merge3 $Q15 $A28 @{1113=4;134=4;128=3;4113=3;2083=2;2109=1}) 'rainbow'
AddDeck 'rb_warlock_demo_mid' 'Warlock · Demonology · Mid' 13 (Merge4 $Q15 $C26 @{322=3;329=2;2220=2;327=2;4292=2;1251=2;2210=1} @{1107=2;133=2;134=1}) 'rainbow'
AddDeck 'rb_warlock_affl_ctrl' 'Warlock · Affliction · Control' 2012 (Merge3 $Q12 @{134=4;4113=3;2083=3;1114=3;2090=1;171=2} $B32) 'rainbow'

# --- Warrior
AddDeck 'rb_warrior_fury_aggro' 'Warrior · Fury · Aggro' 1012 (Merge4 $Q15 $A28 @{312=3;4289=2;3124=2;4285=1;1285=1;285=1} @{1119=2;5125=2;137=2;1121=1}) 'rainbow'
AddDeck 'rb_warrior_arms_mid' 'Warrior · Arms · Mid' 9 (Merge4 $Q15 $C26 @{312=3;4289=2;4285=2;3124=2;1285=2;290=2;285=1} @{145=2;1115=2;137=1}) 'rainbow'
AddDeck 'rb_warrior_prot_ctrl' 'Warrior · Protection · Control' 2013 (Merge3 $Q12 @{141=4;1121=4;137=4;143=1;171=2;2109=1} $B32) 'rainbow'

# ---------------------------------------------------------------- Fokus-Zwillinge (gleiche Klasse/Talent/Archetyp, anderer Fokus)
AddDeck 'rb_druid_feral_aggro_eq' 'Druid · Feral · Aggro (Ausrüstung)' 16 (Merge4 $Q15 $A28 @{1287=4;327=4;1260=1;4272=1} @{2027=3;1026=2;29=2}) 'focus'
AddDeck 'rb_hunter_mm_aggro_eq' 'Hunter · Marksmanship · Aggro (Ausrüstung)' 2016 (Merge4 $Q15 $A28 @{312=3;1280=3;3119=2;4291=1;5232=1} @{32=3;33=2;1042=2}) 'focus'
AddDeck 'rb_mage_fire_aggro_eq' 'Mage · Fire · Aggro (Ausrüstung)' 15 (Merge4 $Q15 $A28 @{322=3;329=2;2220=2;327=1;4292=1;5217=1} @{1053=3;52=2;4046=2}) 'focus'
AddDeck 'rb_paladin_ret_aggro_eq' 'Paladin · Retribution · Aggro (Ausrüstung)' 4014 (Merge4 $Q15 $A28 @{312=3;1280=3;3119=2;1286=1;1257=1} @{1058=3;68=2;1063=2}) 'focus'
AddDeck 'rb_priest_shadow_aggro_eq' 'Priest · Shadow · Aggro (Ausrüstung)' 5025 (Merge4 $Q15 $A28 @{322=3;329=2;2218=2;327=1;4292=1;3105=1} @{4077=3;76=2;88=2}) 'focus'
AddDeck 'rb_rogue_assn_aggro_eq' 'Rogue · Assassination · Aggro (Ausrüstung)' 2018 (Merge4 $Q15 $A28 @{4275=3;4293=3;315=2;1280=1;288=1} @{92=3;2070=2;99=2}) 'focus'
AddDeck 'rb_warlock_destr_aggro_eq' 'Warlock · Destruction · Aggro (Ausrüstung)' 1018 (Merge4 $Q15 $A28 @{322=3;329=2;2220=2;327=1;4292=1;1251=1} @{1113=3;134=2;2083=2}) 'focus'
AddDeck 'rb_shaman_enh_aggro_ab' 'Shaman · Enhancement · Aggro (Fähigkeiten)' 1014 (Merge3 $Q15 $A28 @{5103=4;113=3;109=3;1101=3;5101=2;2076=2}) 'focus'
AddDeck 'rb_warrior_fury_aggro_ab' 'Warrior · Fury · Aggro (Fähigkeiten)' 1012 (Merge3 $Q15 $A28 @{137=4;1121=4;141=3;5125=2;1119=2;159=2}) 'focus'

# ---------------------------------------------------------------- Ausgabe
$saved = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
function WriteLib {
    param([string]$file, $list)
    $obj = [ordered]@{ app = 'wow-tcg'; saved = $saved; decks = @($list) }
    $json = $obj | ConvertTo-Json -Depth 8
    [System.IO.File]::WriteAllText((Join-Path $outDir $file), $json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host ("{0}: {1} Decks" -f $file, $list.Count)
}

WriteLib 'deck_library_all.json' $script:decks
WriteLib 'deck_library_rainbow.json' @($script:decks | Where-Object { $_.group -ne 'meta10' })
WriteLib 'deck_library_meta10.json' @($script:decks | Where-Object { $_.group -eq 'meta10' })

# Kurz-Kontrolle: 60 Karten je Deck
$bad = @()
foreach ($d in $script:decks) { if ($d.cards.Count -ne 60) { $bad += ("{0}: {1}" -f $d.id, $d.cards.Count) } }
if ($bad.Count) { Write-Host "WARNUNG Kartenzahl:"; $bad | ForEach-Object { Write-Host "  $_" } } else { Write-Host 'Alle Decks: 60 Karten.' }
