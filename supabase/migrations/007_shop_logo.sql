-- Shop logo (SVG text, kept small for free-tier DB)
alter table shops add column if not exists logo_svg text;
