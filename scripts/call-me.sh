#!/usr/bin/env bash
# Call me — dispatches a voice call to your phone via the SLNG voice service.
# Usage: ./scripts/call-me.sh [phone-number] [account-name] [goal]
#
# Defaults:
#   phone-number: +447402184536
#   account-name: Gamma
#   goal:         Churn rescue — Stripe subscription cancelled, win them back.

set -euo pipefail

PHONE="${1:-+447402184536}"
ACCOUNT="${2:-Gamma}"
GOAL="${3:-Churn rescue for $ACCOUNT — Stripe subscription cancelled. Win them back.}"

VOICE_URL="https://attio-voice.onrender.com/calls"

echo "→ Calling $PHONE ($ACCOUNT)..."
echo "  Goal: $GOAL"
echo

RESPONSE=$(curl -sS -m 30 -X POST "$VOICE_URL" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "signal": {
    "accountName": "$ACCOUNT",
    "contactName": "Richard",
    "toNumber": "$PHONE",
    "goal": "$GOAL",
    "notes": "Stripe subscription cancelled"
  }
}
EOF
)")

CALL_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('call',{}).get('id','unknown'))" 2>/dev/null || echo "unknown")
STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('call',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")

echo "✓ Call dispatched"
echo "  call_id: $CALL_ID"
echo "  status:  $STATUS"
echo
echo "  Watch live: https://attio-flax.vercel.app/calls"
