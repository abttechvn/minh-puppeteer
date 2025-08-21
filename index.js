const puppeteer = require('puppeteer');

(async () => {
  // --- your cookies array ---
  const cookies = [{"domain":".douyin.com","expirationDate":1787198534.936154,"hostOnly":false,"httpOnly":false,"name":"enter_pc_once","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"1"},{"domain":".douyin.com","expirationDate":1786593256,"hostOnly":false,"httpOnly":false,"name":"UIFID_TEMP","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"fd93a02f3f52f94d15e514b5060909b7718dbdccf5e652d020e98a2368c5c67ff97c875611ae0d2e7cc8ed8f185832f2e6c7533081a083b4feee0a55434809e2f8bc045adb6c542e2aa271c9f1313d9e"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"x-web-secsdk-uid","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"6a6c7c9d-05e4-4126-8e4c-b3dc4b00f4df"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"douyin.com"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"device_web_cpu_core","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"4"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"device_web_memory_size","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"8"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"architecture","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"amd64"},{"domain":".douyin.com","expirationDate":1787097945,"hostOnly":false,"httpOnly":false,"name":"hevc_supported","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"true"},{"domain":"www.douyin.com","expirationDate":1753176645,"hostOnly":true,"httpOnly":false,"name":"dy_swidth","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"1280"},{"domain":"www.douyin.com","expirationDate":1753176645,"hostOnly":true,"httpOnly":false,"name":"dy_sheight","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"720"},{"domain":"www.douyin.com","expirationDate":1786593259,"hostOnly":true,"httpOnly":false,"name":"fpk1","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"U2FsdGVkX19ix6kzyboWhcxk7BsaGqH4gIepa2xxj7TF4feYt8RsuqiR3u/LMHuv9k7FSLsvhTiCnU3cuT2+3w=="},{"domain":"www.douyin.com","expirationDate":1786593259,"hostOnly":true,"httpOnly":false,"name":"fpk2","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"6dbb10952a38c11d19e2648023d5055b"},{"domain":"www.douyin.com","expirationDate":1757217260,"hostOnly":true,"httpOnly":false,"name":"s_v_web_id","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"verify_mcvfd7lw_H3KKRaij_ylSY_4mUM_9nZx_KjaYTb6Cd73x"},{"domain":".douyin.com","expirationDate":1784108239,"hostOnly":false,"httpOnly":true,"name":"odin_tt","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"b1518168955bdbd362aee9a99795f8eae1bd83979d97aceac9cab33fe6b0fcf740b042480e6c9cf3bb96ae59e7c4f0e7af1a7af876e8582fad59204fbaf5a41e"},{"domain":"www.douyin.com","expirationDate":1786593265,"hostOnly":true,"httpOnly":false,"name":"UIFID","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"fd93a02f3f52f94d15e514b5060909b7718dbdccf5e652d020e98a2368c5c67fa0ec45532f52d9048447e2f662cc7cdf648b4be6c0dc65d26f15b925965032b0db03dd1ab25d546454326b61dcdadb5de651c06c78f02a4e13013218f8747f973afed261927fb0ca51dd6c129349579a09cf37c5bbf1e3c37bbe5ac3c9ac1c967a4c0a865a93d37af11003d2e6e0518408393bb05b44e0106b0cfb75a1c02c6c"},{"domain":".douyin.com","expirationDate":1787097945,"hostOnly":false,"httpOnly":false,"name":"volume_info","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%7B%22isUserMute%22%3Afalse%2C%22isMute%22%3Afalse%2C%22volume%22%3A0.065%7D"},{"domain":".douyin.com","expirationDate":1753174341,"hostOnly":false,"httpOnly":false,"name":"WallpaperGuide","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%7B%22showTime%22%3A1752476675450%2C%22closeTime%22%3A0%2C%22showCount%22%3A2%2C%22cursor1%22%3A53%2C%22cursor2%22%3A16%2C%22hoverTime%22%3A1752553661616%7D"},{"domain":"www.douyin.com","expirationDate":1783569307,"hostOnly":true,"httpOnly":false,"name":"xgplayer_user_id","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"803557636755"},{"domain":".douyin.com","expirationDate":1753174335,"hostOnly":false,"httpOnly":false,"name":"is_dash_user","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"1"},{"domain":"www.douyin.com","hostOnly":true,"httpOnly":false,"name":"xg_device_score","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"6.940114010560383"},{"domain":".douyin.com","expirationDate":1757217336,"hostOnly":false,"httpOnly":false,"name":"passport_csrf_token","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"c9feae16ab55d3565f4f04f26ca01f4b"},{"domain":".douyin.com","expirationDate":1757217336,"hostOnly":false,"httpOnly":false,"name":"passport_csrf_token_default","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"c9feae16ab55d3565f4f04f26ca01f4b"},{"domain":".douyin.com","expirationDate":1757217336,"hostOnly":false,"httpOnly":false,"name":"__security_mc_1_s_sdk_cert_key","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"c8447b01-4b4f-841d"},{"domain":".douyin.com","expirationDate":1757217336,"hostOnly":false,"httpOnly":false,"name":"__security_mc_1_s_sdk_sign_data_key_web_protect","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"28b28559-45f6-b6a2"},{"domain":".douyin.com","expirationDate":1757217336,"hostOnly":false,"httpOnly":false,"name":"__security_mc_1_s_sdk_crypt_sdk","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"e7b40a6e-403c-839a"},{"domain":".douyin.com","expirationDate":1757755846,"hostOnly":false,"httpOnly":false,"name":"bd_ticket_guard_client_web_domain","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"2"},{"domain":".douyin.com","expirationDate":1753142752,"hostOnly":false,"httpOnly":false,"name":"strategyABtestKey","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%221752537951.996%22"},{"domain":".douyin.com","expirationDate":1753174340,"hostOnly":false,"httpOnly":false,"name":"download_guide","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%223%2F20250709%2F1%22"},{"domain":".douyin.com","expirationDate":1753176645,"hostOnly":false,"httpOnly":false,"name":"stream_recommend_feed_params","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%22%7B%5C%22cookie_enabled%5C%22%3Atrue%2C%5C%22screen_width%5C%22%3A1280%2C%5C%22screen_height%5C%22%3A720%2C%5C%22browser_online%5C%22%3Atrue%2C%5C%22cpu_core_num%5C%22%3A4%2C%5C%22device_memory%5C%22%3A8%2C%5C%22downlink%5C%22%3A10%2C%5C%22effective_type%5C%22%3A%5C%224g%5C%22%2C%5C%22round_trip_time%5C%22%3A100%7D%22"},{"domain":".douyin.com","expirationDate":1753176646,"hostOnly":false,"httpOnly":false,"name":"home_can_add_dy_2_desktop","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%221%22"},{"domain":".douyin.com","expirationDate":1783742533.936006,"hostOnly":false,"httpOnly":true,"name":"ttwid","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"1%7C2kZIU4ApPnV3s_-9aRhl-DRSpt-YAzxN5V80yH98HEM%7C1752571853%7C05bcedad52ccf7ee20d5cbd60d5c3ab41ae16c0b0f125760c7e40bdf0f274d51"},{"domain":".douyin.com","hostOnly":false,"httpOnly":false,"name":"biz_trace_id","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"dd98d556"},{"domain":".douyin.com","expirationDate":1757755846,"hostOnly":false,"httpOnly":false,"name":"bd_ticket_guard_client_data","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWl0ZXJhdGlvbi12ZXJzaW9uIjoxLCJiZC10aWNrZXQtZ3VhcmQtcmVlLXB1YmxpYy1rZXkiOiJCT0hqNjd5SEhJYnNJN1VuWGxpUWR1MXZtWmNyc1UxRDBMN1pNd2Y2c3VXT05yS0dlSzBreTRFV05SMFFjNnFSaDhFRHdZRyt6Z2FiRUVGWlp3a3IzU0E9IiwiYmQtdGlja2V0LWd1YXJkLXdlYi12ZXJzaW9uIjoyfQ%3D%3D"},{"domain":".douyin.com","expirationDate":1753176628,"hostOnly":false,"httpOnly":false,"name":"stream_player_status_params","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%22%7B%5C%22is_auto_play%5C%22%3A0%2C%5C%22is_full_screen%5C%22%3A0%2C%5C%22is_full_webscreen%5C%22%3A1%2C%5C%22is_mute%5C%22%3A0%2C%5C%22is_speed%5C%22%3A1%2C%5C%22is_visible%5C%22%3A0%7D%22"},{"domain":".douyin.com","expirationDate":1753181896,"hostOnly":false,"httpOnly":false,"name":"IsDouyinActive","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"false"},{"domain":".douyin.com","expirationDate":1786784818,"hostOnly":false,"httpOnly":false,"name":"my_rd","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"2"},{"domain":".douyin.com","expirationDate":1787036777,"hostOnly":false,"httpOnly":false,"name":"passport_assist_user","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"CkEQ3K9WQ4K19VjNdRoTS04Qy6AUwggIB4uV7MwSjpD7cHyB3C_3cpnsyfFfSlY_KaY5M0RtC0Kw-Z3_FU90-nBX8RpKCjwAAAAAAAAAAAAATzvS5IdMmbyFi_AEEaQj-c76nTRHFhxT8tgP1nw6CigEo7I0lqoV7E6Ipzu1uvNmKFkQ9tn2DRiJr9ZUIAEiAQO5Dq8h"},{"domain":".douyin.com","expirationDate":1762844777,"hostOnly":false,"httpOnly":true,"name":"n_mh","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"u74rFu3H1sIV3Byj4_tYjujRN-IvI3U6ImKkXeHJXGs"},{"domain":".douyin.com","expirationDate":1783580777,"hostOnly":false,"httpOnly":true,"name":"sid_guard","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"68995ed4b8a5278c845ef36e0b20b79a%7C1752476778%7C5184000%7CFri%2C+12-Sep-2025+07%3A06%3A18+GMT"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"uid_tt","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"51d8699096087ef9c070a982358d00e4"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"uid_tt_ss","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"51d8699096087ef9c070a982358d00e4"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"sid_tt","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"68995ed4b8a5278c845ef36e0b20b79a"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"sessionid","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"68995ed4b8a5278c845ef36e0b20b79a"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"sessionid_ss","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"68995ed4b8a5278c845ef36e0b20b79a"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"session_tlb_tag","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"sttt%7C10%7CaJle1LilJ4yEXvNuCyC3mv_________GtKHOdVMCvrPuKi-6GyXU-jUBc06_c2N2RErXn7sDWuY%3D"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"is_staff_user","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"false"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"sid_ucp_v1","path":"/","sameSite":"unspecified","secure":true,"session":false,"storeId":"0","value":"1.0.0-KDA5OGJkNWZmYjUxNTUxZDI2YjdlYWQ5MjMwYmZkN2ZiYTM4NjJkNjAKIQjbpqCdg42oBxDq2NLDBhjvMSAMMNjijYQGOAdA9AdIBBoCbHEiIDY4OTk1ZWQ0YjhhNTI3OGM4NDVlZjM2ZTBiMjBiNzlh"},{"domain":".douyin.com","expirationDate":1757660777,"hostOnly":false,"httpOnly":true,"name":"ssid_ucp_v1","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"1.0.0-KDA5OGJkNWZmYjUxNTUxZDI2YjdlYWQ5MjMwYmZkN2ZiYTM4NjJkNjAKIQjbpqCdg42oBxDq2NLDBhjvMSAMMNjijYQGOAdA9AdIBBoCbHEiIDY4OTk1ZWQ0YjhhNTI3OGM4NDVlZjM2ZTBiMjBiNzlh"},{"domain":".douyin.com","expirationDate":1753081578,"hostOnly":false,"httpOnly":false,"name":"publish_badge_show_info","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%220%2C0%2C0%2C1752476778424%22"},{"domain":".douyin.com","expirationDate":1757660778,"hostOnly":false,"httpOnly":false,"name":"_bd_ticket_crypt_cookie","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"9ec0e89fdf5241ee81d3229eaf7e2752"},{"domain":".douyin.com","expirationDate":1757660778,"hostOnly":false,"httpOnly":false,"name":"__security_server_data_status","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"1"},{"domain":".douyin.com","expirationDate":1784107845,"hostOnly":false,"httpOnly":false,"name":"SelfTabRedDotControl","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%5B%5D"},{"domain":".douyin.com","expirationDate":1753176613,"hostOnly":false,"httpOnly":false,"name":"FOLLOW_LIVE_POINT_INFO","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%22MS4wLjABAAAAB4-TkHOFx13sU0zxh1uGDKoWWWgrO1NowJFhDfmIWT3Y7eJmbuEtpSQHaLcIeWCt%2F1752598800000%2F0%2F1752571813827%2F0%22"},{"domain":".douyin.com","expirationDate":1753176646,"hostOnly":false,"httpOnly":false,"name":"FOLLOW_NUMBER_YELLOW_POINT_INFO","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"%22MS4wLjABAAAAB4-TkHOFx13sU0zxh1uGDKoWWWgrO1NowJFhDfmIWT3Y7eJmbuEtpSQHaLcIeWCt%2F1752598800000%2F0%2F1752571846357%2F0%22"},{"domain":".www.douyin.com","hostOnly":false,"httpOnly":false,"name":"passport_fe_beating_status","path":"/","sameSite":"unspecified","secure":false,"session":true,"storeId":"0","value":"false"},{"domain":"www.douyin.com","expirationDate":1752640333.959748,"hostOnly":true,"httpOnly":false,"name":"__ac_nonce","path":"/","sameSite":"unspecified","secure":false,"session":false,"storeId":"0","value":"0687724460001ec01fe9e"},{"domain":"www.douyin.com","expirationDate":1784174534,"hostOnly":true,"httpOnly":false,"name":"__ac_signature","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"_02B4Z6wo00f01C6cCMAAAIDBOyRBufPIK2QuvAxAAGPWf0"},{"domain":"www.douyin.com","expirationDate":1784174534,"hostOnly":true,"httpOnly":false,"name":"__ac_referer","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"__ac_blank"}];

  // Normalize cookies for Puppeteer (convert expirationDate to expires)
  for (const cookie of cookies) {
    if (cookie.expirationDate) {
      cookie.expires = Math.floor(cookie.expirationDate);
      delete cookie.expirationDate;
    }
  }

  // List of realistic user agents
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    // ...add more!
  ];

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const width = 1280 + Math.floor(Math.random() * 100); // 1280-1379px
  const height = 720 + Math.floor(Math.random() * 100); // 720-819px

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width, height },
    args: [
      `--window-size=${width},${height}`,
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent);
  await page.setCookie(...cookies);

  const CHANNEL_URL = 'https://www.douyin.com/user/MS4wLjABAAAATWckLZmAzCJezIeMamOikWmNtl9L259tE_QGZNISIlM';
  await page.goto(CHANNEL_URL, { waitUntil: 'networkidle2', timeout: 90000 });

  // Simulate some random mouse movement and wait
  await new Promise(r => setTimeout(r, 8000 + Math.random() * 3000));
  await page.mouse.move(
    100 + Math.random() * (width - 200),
    100 + Math.random() * (height - 200)
  );
  await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));

  let prevCount = 0;
  let sameCountTimes = 0;
  let uniqueLinks = [];

  while (sameCountTimes < 3) {
    await page.evaluate(() => {
      const container = document.querySelector('.route-scroll-container');
      if (container) {
        container.scrollBy(0, 800);
      } else {
        window.scrollBy(0, window.innerHeight);
      }
    });
    // Human-like scroll delay
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 3500));

    // Move mouse randomly again
    await page.mouse.move(
      100 + Math.random() * (width - 200),
      100 + Math.random() * (height - 200)
    );

    const videoLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map(a => a.getAttribute('href'))
        .filter(href =>
          href &&
          (
            href.startsWith('/video/') ||
            href.startsWith('/note/') ||
            href.startsWith('//www.douyin.com/note')
          )
        )
        .map(href => {
          if (href.startsWith('//')) return 'https:' + href;
          if (href.startsWith('/')) return 'https://www.douyin.com' + href;
          return href;
        });
    });

    const linksSet = new Set([...uniqueLinks, ...videoLinks]);
    const newCount = linksSet.size;

    if (newCount === prevCount) {
      sameCountTimes++;
    } else {
      sameCountTimes = 0;
      prevCount = newCount;
    }
    uniqueLinks = [...linksSet];
    console.log(`Found ${uniqueLinks.length} unique video links so far...`);
  }

  // Build array of { url: ... }
  const videoObjects = uniqueLinks.map(link => ({ url: link }));

  // Print nicely to console
  console.log('Array of video objects:', videoObjects);
  console.log(`Total: ${videoObjects.length}`);

  // Optionally, write to a file:
  // require('fs').writeFileSync('video_links.json', JSON.stringify(videoObjects, null, 2), 'utf-8');

  await browser.close();

  // If you want the result for further use, just return videoObjects
  return videoObjects;
})();
