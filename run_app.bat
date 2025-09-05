@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

:menu
cls
echo ==============================================
echo   Douyin Automation Suite - Launcher (Windows)
echo ==============================================
echo.
echo  1) Extract channel data (paste channel URL)
echo  2) Download images from notes (pick notes_links.txt)
echo  3) Fetch downloadable video links (URL or videos_links.txt)
echo  4) Download highest-quality videos (from batch folder)
echo  5) Run setup (first-time only)
echo  0) Exit
echo.
set /p choice=Select an option [0-5]: 
if "%choice%"=="1" goto extract
if "%choice%"=="2" goto images
if "%choice%"=="3" goto fetchlinks
if "%choice%"=="4" goto downloadvideos
if "%choice%"=="5" goto setup
if "%choice%"=="0" goto end

echo Invalid choice.
pause
goto menu

:extract
cls
echo Paste the Douyin channel URL and press Enter:
set /p CHANNEL_URL=
if "%CHANNEL_URL%"=="" goto menu
node fetch_video_links.js "%CHANNEL_URL%"
echo.
pause
goto menu

:images
cls
echo Enter the path to notes_links.txt (drag-and-drop file here works) and press Enter:
set /p NOTES_FILE=
if "%NOTES_FILE%"=="" goto menu
node picture.js "%NOTES_FILE%"
echo.
pause
goto menu

:fetchlinks
cls
echo Choose mode:
echo   1) Single video URL (paste URL)
echo   2) From file (videos_links.txt path)
set /p sub=Select [1-2]: 
if "%sub%"=="1" goto fetch_url
if "%sub%"=="2" goto fetch_file
goto menu

:fetch_url
cls
echo Paste the Douyin video URL (short v.douyin links are OK) and press Enter:
set /p VIDEO_URL=
if "%VIDEO_URL%"=="" goto menu
node fetch_downloadable_link.js "%VIDEO_URL%"
echo.
pause
goto menu

:fetch_file
cls
echo Enter the path to videos_links.txt (drag-and-drop file here works) and press Enter:
set /p VIDEO_FILE=
if "%VIDEO_FILE%"=="" goto menu
node fetch_downloadable_link.js --file "%VIDEO_FILE%"
echo.
pause
goto menu

:downloadvideos
cls
echo Leave blank to auto-detect latest batch, or paste a specific batch folder path:
set /p BATCH_DIR=
if "%BATCH_DIR%"=="" (
  node download_videos.js
) else (
  node download_videos.js --batch "%BATCH_DIR%"
)
echo.
pause
goto menu

:setup
cls
call npm install
node setup.js
echo.
pause
goto menu

:end
endlocal
exit /b 0
