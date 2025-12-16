# Supabase Auth - Diagnostyka problemu z wyrzucaniem sesji po 3 minutach

## Problem
- Użytkownik jest wyrzucany z aplikacji po ~3 minutach
- Dzieje się to nawet bez klikania w zakładki
- Token refresh nie działa poprawnie

## Możliwe przyczyny

### 1. JWT Expiry Time (najbardziej prawdopodobne)
**Gdzie sprawdzić:** Supabase Dashboard → Authentication → Settings

Domyślnie:
- JWT expiry: **3600 sekund (60 minut)**
- Refresh token expiry: **2592000 sekund (30 dni)**

**PROBLEM:** Jeśli ktoś zmienił JWT expiry na 180 sekund (3 minuty) - to wyjaśnia problem!

**Jak naprawić:**
1. Zaloguj się do Supabase Dashboard
2. Idź do: Project → Settings → Auth
3. Znajdź: "JWT expiry limit"
4. Ustaw na: `3600` (60 minut) lub więcej
5. Save

### 2. Refresh Token Rotation
**Problem:** Jeśli `Reuse Interval` jest za krótki, może powodować problemy

**Gdzie sprawdzić:** Authentication → Settings → Refresh Token Settings

Zalecane ustawienia:
- Refresh token reuse interval: `10` (sekund)
- Refresh token rotation: `enabled`

### 3. Cookie Settings (dla web apps)
**Problem:** Cookies mogą być blokowane przez przeglądarkę

**Sprawdź w Chrome DevTools:**
1. Application → Cookies
2. Szukaj: `sb-*` cookies
3. Czy są ustawione `Secure` i `SameSite`?

### 4. localStorage Cleanup
**Problem:** Inny skrypt może czyścić localStorage

**Sprawdź w konsoli:**
```javascript
// Zobacz co jest w localStorage
Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('unwalk'))

// Sprawdź czy session jest zapisana
localStorage.getItem('unwalk-auth')
```

### 5. Network Issues
**Problem:** Słabe połączenie może powodować timeout na refresh

**Sprawdź w Network tab:**
- Czy są błędy `401 Unauthorized`?
- Czy request do `/auth/v1/token?grant_type=refresh_token` się powiódł?

## Natychmiastowe kroki naprawcze

### Krok 1: Sprawdź JWT expiry w Supabase
```
Dashboard → Settings → Auth → JWT expiry limit
```
**Powinno być:** 3600 lub więcej

### Krok 2: Sprawdź logi w konsoli
Po moich zmianach zobaczysz:
```
🔐 [Supabase] Auth event: TOKEN_REFRESHED
✅ [Supabase] Token refreshed successfully
```

Jeśli NIE widzisz tego co 3 minuty - problem jest w konfiguracji Supabase!

### Krok 3: Test w konsoli
Otwórz Console i wklej:
```javascript
// Sprawdź current session
const { data, error } = await window.supabase?.auth.getSession();
console.log('Session:', data.session);
console.log('Expires at:', data.session?.expires_at);
console.log('Time to expiry:', data.session?.expires_at ? (data.session.expires_at - Math.floor(Date.now() / 1000)) + ' seconds' : 'N/A');
```

### Krok 4: Testuj refresh
```javascript
// Wymuś refresh tokena
const { data, error } = await window.supabase?.auth.refreshSession();
console.log('Refresh result:', { data, error });
```

## Dodatkowy fix - Heartbeat
Jeśli problem będzie się utrzymywał, mogę dodać "heartbeat" który będzie co minutę sprawdzał sesję i odświeżał ją.

## SQL Query - sprawdź session timeout w bazie
```sql
-- Sprawdź czy są jakieś custom ustawienia w bazie
SELECT 
  name, 
  setting 
FROM pg_settings 
WHERE name LIKE '%timeout%' OR name LIKE '%idle%';
```

## Expected Behavior
- Token powinien być odświeżany automatycznie ~5 minut PRZED wygaśnięciem
- Użytkownik nie powinien NIGDY zobaczyć wylogowania (chyba że sam kliknie logout)
- Session powinna trwać 30 dni (refresh token)

## Red Flags 🚩
- JWT expiry < 900 sekund (15 minut)
- Brak logów "TOKEN_REFRESHED" w konsoli
- Cookies są blockowane przez browser
- `localStorage.getItem('unwalk-auth')` zwraca `null` po 3 minutach
