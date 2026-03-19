
-- Update Feb 21 entries with proper images and kg
UPDATE rescue_history SET image_url = '/images/gergely_dzsida_mentese.jpg', megmentett_kg = 10 WHERE id = 'fc6e7919-2564-426f-9880-ef23efed6ee8';
UPDATE rescue_history SET image_url = '/images/gergely_dzsida_mentese.jpg', megmentett_kg = 10 WHERE id = '0ede328b-668e-49aa-90e8-6a64a1ffff1b';
UPDATE rescue_history SET image_url = '/images/lorincz_rebeka_mentese.jpg' WHERE id = '000b5a07-1349-4b8a-8b75-dd71f4440e8d';

-- Update Mar 13 entry for Kárpáti Barnabás
UPDATE rescue_history SET image_url = '/images/karpati_barnabas_mentese.jpg', megmentett_kg = 8 WHERE id = 'e2fd90e3-5195-4d98-a1c2-3ceac49032d8';

-- Create Mar 13 entries for volunteers with images
INSERT INTO rescue_history (user_id, store_id, het_datuma, tipus, megmentett_kg, image_url) VALUES
('22b8a7a0-b82c-4a4d-9bf3-92b6135dd654', '9c0b28c5-b0fd-4756-8388-00b018c9e661', '2026-03-13', 'egyszeri', 15, '/images/mandl_jazmin_mentese.jpg'),
('5bce3bff-363f-414f-8370-0682467e31e6', '3da754a4-0e6a-465f-818b-220c8195b259', '2026-03-13', 'egyszeri', 12, '/images/ott_rozi_mentese.jpg'),
('5b6fde16-ccc3-44b1-a936-db0f39f72962', 'cab0d406-78ea-4c3c-a548-c5ba046061f4', '2026-03-13', 'egyszeri', 5, '/images/tatai_szilvi_mentese.jpg'),
('af9faa5b-1f87-486d-9ed7-a910ce5bc276', '02b5292c-14c4-42fe-83ba-11efa7a9e1f4', '2026-03-13', 'egyszeri', 12, '/images/gregor_csaba_mentese.jpg');
