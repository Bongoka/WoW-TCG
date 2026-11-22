$j = Get-Content "G:\downloads\WoW TCG Game 3\addon\_tcg_pool.json" -Raw | ConvertFrom-Json
$fields = @{}
foreach ($p in $j.cards.PSObject.Properties) {
  foreach ($f in $p.Value.PSObject.Properties.Name) { $fields[$f] = 1 }
}
"FIELDS:"
$fields.Keys | Sort-Object
"XCOST:"
foreach ($p in $j.cards.PSObject.Properties) {
  $c = $p.Value
  if ($c.xCost) { Write-Output ("{0} {1} xCost={2}" -f $c.id, $c.name, $c.xCost) }
}
"ALLY SAMPLE:"
$n = 0
foreach ($p in $j.cards.PSObject.Properties) {
  $c = $p.Value
  if ($c.type -eq 'Ally' -and ($c.race -or $c.faction -or $c.allyTypes) -and $n -lt 15) {
    Write-Output ("{0} {1} race={2} faction={3} types={4}" -f $c.id, $c.name, $c.race, $c.faction, ($c.allyTypes -join '/'))
    $n++
  }
}
