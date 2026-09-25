# Using jq (fast, no code)
IMEI = 351505860326696
jq --arg tac "${IMEI:0:8}" '.[] | select(.tac == $tac)' tacdb.json
# Or grep if TAC is at line start
grep "^${IMEI:0:8}" tacdb.json
