# 加拿大政府抓取源清单 (drive bfs_crawler + download_md)

驱动直接 HTML→Markdown 抓取（不走 MinerU）。覆盖**联邦 + 10 省 3 领地**的
新闻 / 政策 / 移民 / 税收 / 福利。

## 用法

每行一个 seed。对每一行：

```powershell
# cwd: short-video-studio/
uv run python scripts/crawl/bfs_crawler.py discover <seed_url> <slug> --depth <depth> --max-pages <max_pages>
uv run python scripts/crawl/download_md.py docs/<slug>/manifest.json
```

产物：`docs/<slug>/manifest.json` → `docs/<slug>/md/*.md`。

> 说明：
> - **slug** 唯一，决定 `docs/<slug>/` 输出目录。
> - **depth/max_pages** 是 BFS 预算；新闻类浅而宽（depth 1），主题枢纽页深一层（depth 2）。
> - bfs_crawler 已用 Chrome UA，Yukon 等站点可正常抓取。
> - URL 均为 2026-06-18 实测 HTTP 200（除「待核实」一节）。

---

## 抓取源主表

> **scope 列**（可选第 7 列）：留空 = 默认按路径前缀抓（层级站）；`kw:a,b,c` = 同域名 +
> 路径含任一关键词也抓（扁平站如 ontario.ca/page/X、alberta.ca/X）。

| 地区 | 主题 | slug | seed_url | depth | max_pages | scope |
| ---- | ---- | ---- | -------- | ----- | --------- | ----- |
| 联邦 | 新闻 | federal-news | https://www.canada.ca/en/news.html | 1 | 60 |
| 联邦 | 政策 | federal-policy-gazette | https://gazette.gc.ca/rp-pr/publications-eng.html | 1 | 60 |
| 联邦 | 移民 | federal-immigration | https://www.canada.ca/en/services/immigration-citizenship.html | 2 | 200 |
| 联邦 | 移民-公告 | federal-immigration-notices | https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html | 1 | 80 |
| 联邦 | 税收 | federal-tax | https://www.canada.ca/en/services/taxes.html | 2 | 150 |
| 联邦 | 福利 | federal-welfare | https://www.canada.ca/en/services/benefits.html | 2 | 150 |
| 安大略 | 新闻 | on-news | https://news.ontario.ca/en | 1 | 60 |
| 安大略 | 移民 | on-immigration | https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp | 2 | 150 | kw:oinp,nominee,immigrant |
| 安大略 | 税收 | on-tax | https://www.ontario.ca/page/taxes-and-benefits | 2 | 120 | kw:tax |
| 安大略 | 福利 | on-welfare | https://www.ontario.ca/page/social-assistance | 2 | 120 | kw:assistance,ontario-works,disability |
| 魁北克 | 新闻 | qc-news | https://www.quebec.ca/en/news | 1 | 60 |
| 魁北克 | 移民 | qc-immigration | https://www.quebec.ca/en/immigration | 2 | 150 |
| 魁北克 | 税收 | qc-tax | https://www.quebec.ca/en/finance-income-and-other-taxes | 2 | 120 |
| BC | 新闻 | bc-news | https://news.gov.bc.ca/ | 1 | 60 |
| BC | 移民 | bc-immigration | https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program | 2 | 150 |
| BC | 税收 | bc-tax | https://www2.gov.bc.ca/gov/content/taxes | 2 | 120 |
| BC | 福利 | bc-welfare | https://www2.gov.bc.ca/gov/content/family-social-supports/income-assistance | 2 | 120 |
| 阿尔伯塔 | 新闻 | ab-news | https://www.alberta.ca/news | 1 | 60 |
| 阿尔伯塔 | 移民 | ab-immigration | https://www.alberta.ca/immigration | 2 | 150 | kw:immigration,aaip,nominee |
| 阿尔伯塔 | 税收 | ab-tax | https://www.alberta.ca/personal-income-tax | 2 | 120 | kw:tax |
| 阿尔伯塔 | 福利 | ab-welfare | https://www.alberta.ca/income-support | 2 | 120 | kw:income-support,aish,benefit |
| 曼尼托巴 | 新闻 | mb-news | https://news.gov.mb.ca/news/ | 1 | 60 |
| 曼尼托巴 | 移民 | mb-immigration | https://immigratemanitoba.com/ | 2 | 150 |
| 曼尼托巴 | 税收 | mb-tax | https://www.gov.mb.ca/finance/taxation/ | 2 | 120 |
| 曼尼托巴 | 福利 | mb-welfare | https://www.gov.mb.ca/fs/eia/ | 2 | 120 |
| 萨斯喀彻温 | 新闻 | sk-news | https://www.saskatchewan.ca/government/news-and-media | 1 | 60 |
| 萨斯喀彻温 | 移民 | sk-immigration | https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program | 2 | 150 |
| 萨斯喀彻温 | 税收 | sk-tax | https://www.saskatchewan.ca/residents/taxes-and-investments | 2 | 120 |
| 萨斯喀彻温 | 福利 | sk-welfare | https://www.saskatchewan.ca/residents/family-and-social-support/financial-help | 2 | 120 |
| 新斯科舍 | 新闻 | ns-news | https://novascotia.ca/news/ | 1 | 60 |
| 新斯科舍 | 移民 | ns-immigration | https://liveinnovascotia.com/ | 2 | 150 |
| 新斯科舍 | 税收 | ns-tax | https://novascotia.ca/finance/en/home/taxation/default.aspx | 2 | 120 |
| 新斯科舍 | 福利 | ns-welfare | https://novascotia.ca/coms/employment/income_assistance/ | 2 | 120 |
| 新不伦瑞克 | 新闻 | nb-news | https://www2.gnb.ca/content/gnb/en/news.html | 1 | 60 |
| 新不伦瑞克 | 移民 | nb-immigration | https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html | 2 | 150 |
| 新不伦瑞克 | 税收 | nb-tax | https://www2.gnb.ca/content/gnb/en/departments/finance/taxes.html | 2 | 120 |
| 新不伦瑞克 | 福利 | nb-welfare | https://www2.gnb.ca/content/gnb/en/departments/social_development/social_assistance.html | 2 | 120 |
| 爱德华王子岛 | 新闻 | pe-news | https://www.princeedwardisland.ca/en/news | 1 | 60 |
| 爱德华王子岛 | 移民 | pe-immigration | https://www.princeedwardisland.ca/en/topic/immigrate-to-pei-as-a-worker | 2 | 150 | kw:immigrat,nominee,pnp |
| 爱德华王子岛 | 税收 | pe-tax | https://www.princeedwardisland.ca/en/topic/taxes | 2 | 120 | kw:tax |
| 爱德华王子岛 | 福利 | pe-welfare | https://www.princeedwardisland.ca/en/topic/social-assistance | 2 | 120 | kw:assistance,social |
| 纽芬兰 | 新闻 | nl-news | https://www.gov.nl.ca/releases/ | 1 | 60 |
| 纽芬兰 | 移民 | nl-immigration | https://www.gov.nl.ca/immigration/ | 2 | 150 |
| 纽芬兰 | 税收 | nl-tax | https://www.gov.nl.ca/fin/tax-programs-incentives/ | 2 | 120 |
| 纽芬兰 | 福利 | nl-welfare | https://www.gov.nl.ca/cssd/incomesupport/ | 2 | 120 |
| 育空 | 新闻 | yt-news | https://yukon.ca/en/news | 1 | 60 |
| 育空 | 移民 | yt-immigration | https://yukon.ca/en/immigration | 2 | 150 |
| 西北地区 | 新闻 | nt-news | https://www.gov.nt.ca/en/newsroom | 1 | 60 |
| 西北地区 | 移民 | nt-immigration | https://www.immigratenwt.ca/immigrate-here | 2 | 150 |
| 西北地区 | 税收 | nt-tax | https://www.fin.gov.nt.ca/en | 2 | 120 |
| 西北地区 | 福利 | nt-welfare | https://www.ece.gov.nt.ca/en/services/income-assistance | 2 | 120 |

---

## 待核实 (实测未通过，需手工确认 URL)

这些站点的目标子页路径未实测到 200，或站点对爬虫返回 403，先列在此，确认后再并入主表。

| 地区 | 主题 | 候选 seed_url | 实测 | 说明 |
| ---- | ---- | ------------- | ---- | ---- |
| 魁北克 | 福利 | https://www.quebec.ca/en/family-and-support-for-individuals | 待核实 | quebec.ca CMS 路径多变，social-assistance 子页 404；建议从此枢纽页 BFS 发现 |
| 育空 | 税收 | https://yukon.ca/en/taxes | 404 | yukon.ca 税收子页路径待确认 |
| 育空 | 福利 | https://yukon.ca/en/legal-and-social-supports | 待核实 | 财务/社会支持子页路径待确认 |
| 努纳武特 | 全部 | https://www.gov.nu.ca/en | 403 | gov.nu.ca 对爬虫返回 403（需进一步绕过或手工抓）；努纳武特无独立 PNP |

> **政策(policy)**：省级「政策变化」主要通过各省**新闻/announcements**频道发布，已由各省
> `*-news` 行覆盖。联邦政策单列 `federal-policy-gazette`（Canada Gazette）。如需各省**法律/法规**
> 专门 seed（如 ontario.ca/laws），告知后另加。
