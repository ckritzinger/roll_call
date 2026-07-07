alter table sessions
  drop constraint if exists sessions_status_check;

alter table sessions
  add constraint sessions_status_check
    check (status in ('attended', 'absent', 'excused'));
