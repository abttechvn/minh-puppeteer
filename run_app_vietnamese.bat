@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

:menu
cls
echo ==============================================
echo   Bộ Tự Động Douyin - Tải Ảnh (Windows)
echo ==============================================
echo.
echo  1) Tải ảnh từ ghi chú (chọn file notes_links.txt)
echo  0) Thoát
echo.
set /p choice=Chọn tùy chọn [0-1]: 
if "%choice%"=="1" goto images
if "%choice%"=="0" goto end

echo Lựa chọn không hợp lệ.
pause
goto menu

:images
cls
echo Nhập đường dẫn đến file notes_links.txt (kéo thả file vào đây) và nhấn Enter:
set /p NOTES_FILE=
if "%NOTES_FILE%"=="" goto menu
node picture.js "%NOTES_FILE%"
echo.
pause
goto menu

:end
endlocal
exit /b 0
