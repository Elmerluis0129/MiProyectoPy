-- Tabla de galerías
drop table if exists galleries cascade;
create table galleries (
  id uuid primary key default uuid_generate_v4(),
  title text,
  selection_limit integer,
  link text unique
);

-- Tabla de fotos
drop table if exists photos cascade;
create table photos (
  id uuid primary key default uuid_generate_v4(),
  gallery_id uuid references galleries(id),
  url text,
  watermarked_url text
);

-- Tabla de marcas de agua
drop table if exists watermarks cascade;
create table watermarks (
  id uuid primary key default uuid_generate_v4(),
  owner text,
  image_url text,
  config jsonb
);
