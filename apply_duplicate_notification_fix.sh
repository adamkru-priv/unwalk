#!/bin/bash
# Script to fix duplicate challenge completion notifications

echo "============================================"
echo "Fix: Duplicate Challenge Completed Notifications"
echo "============================================"
echo ""
echo "Problem: Po wejściu na ekran Solo/Team, dostaniesz DUPLIKAT powiadomienia"
echo "         o ukończeniu wyzwania (mimo że już je ukończyłeś wcześniej)"
echo ""
echo "Rozwiązanie: Trigger sprawdza w push_outbox, czy powiadomienie już istnieje"
echo ""
echo "============================================"
echo "Skopiuj poniższy SQL i uruchom w Supabase SQL Editor:"
echo "============================================"
echo ""
cat fix_duplicate_challenge_completed_notifications.sql
