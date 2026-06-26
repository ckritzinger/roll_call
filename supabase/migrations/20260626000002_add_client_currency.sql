alter table clients
  add column currency text not null default 'ZAR'
    check (currency in ('ZAR', 'USD', 'CAD'));
