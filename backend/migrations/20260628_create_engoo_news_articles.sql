create table if not exists public.engoo_news_articles (
  id text primary key,
  master_id text,
  title text not null,
  section text not null,
  difficulty text,
  published_date text,
  published_at text,
  source text,
  source_url text,
  image_url text,
  image_attribution jsonb,
  excerpt text,
  body jsonb not null default '[]'::jsonb,
  discussion jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_engoo_news_section_date
  on public.engoo_news_articles (section, published_date desc);

create index if not exists idx_engoo_news_difficulty_date
  on public.engoo_news_articles (difficulty, published_date desc);

create index if not exists idx_engoo_news_published_at
  on public.engoo_news_articles (published_at desc);

create or replace function public.set_engoo_news_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_engoo_news_updated_at on public.engoo_news_articles;

create trigger trg_engoo_news_updated_at
before update on public.engoo_news_articles
for each row
execute function public.set_engoo_news_updated_at();
