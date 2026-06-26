-- Add Zoom client location (online clients) and Duet/Zoom service types
alter table clients
  drop constraint if exists clients_location_check,
  drop constraint if exists clients_service_type_check;

alter table clients
  add constraint clients_location_check
    check (location in ('Sedgefield', 'Knysna', 'Both', 'Zoom')),
  add constraint clients_service_type_check
    check (service_type in ('Group', 'Private', 'Both', 'Duet', 'Zoom'));
