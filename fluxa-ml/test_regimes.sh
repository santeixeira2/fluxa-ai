#!/bin/bash

ASSETS=(
    "PETR4.SA" "VALE3.SA" "ITUB4.SA" "BBDC4.SA" "BBAS3.SA"
    "WEGE3.SA" "MGLU3.SA" "B3SA3.SA"
    "AAPL" "MSFT" "NVDA" "TSLA" "AMZN" "GOOGL" "META"
    "NFLX" "BRK-B" "JPM" "V" "COIN"
    "QQQ" "SPY" "DIA" "VT"
    "GC=F" "SI=F" "CL=F" "BZ=F"
    "BTC-USD" "ETH-USD" "SOL-USD" "BNB-USD" "XRP-USD"
    "ADA-USD" "AVAX-USD" "DOGE-USD" "DOT-USD" "POL-USD"
    "LINK-USD" "UNI-USD" "LTC-USD" "XLM-USD" "SHIB-USD"
)

OK=0
FAIL=0

for asset in "${ASSETS[@]}"; do
    response=$(curl -s "http://localhost:8000/regime?asset=${asset}")
    regime=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('regime','?'))" 2>/dev/null)
    confidence=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d.get('confidence',0):.4f}\")" 2>/dev/null)

    if [[ "$regime" == "?" || -z "$regime" ]]; then
        echo "FAIL  $asset → $response"
        ((FAIL++))
    else
        echo "OK    $asset → $regime ($confidence)"
        ((OK++))
    fi
done

echo ""
echo "Results: $OK OK, $FAIL FAIL"
