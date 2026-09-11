@echo off
echo === Checking git status ===
cd /d "C:\Users\maju\Downloads\17-02-2026-main\17-02-2026-main"
git status
echo.
echo === Adding files ===
git add client/src/components/InlinePaddyHamaliForm.tsx
git add client/src/components/InlineRiceHamaliForm.tsx
echo.
echo === Committing ===
git commit -m "fix: resolve syntax errors in other hamali multi-select forms"
echo.
echo === Pushing to GitHub ===
git push origin main
echo.
echo === Done! Check Vercel now for new build ===
pause
