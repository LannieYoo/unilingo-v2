alter table public.engoo_news_articles
  add column if not exists published_at text;

create index if not exists idx_engoo_news_published_at
  on public.engoo_news_articles (published_at desc);
