-- ============================================================
-- WalkThru Tour Steps Import Script
-- Generated from Azure Cloud database: 2026-03-18
-- Run this on your Azure PostgreSQL database
-- ============================================================

-- Clear existing tour_steps to avoid conflicts
-- DELETE FROM tour_steps; -- Uncomment if you want a clean slate

INSERT INTO tour_steps (id, tour_id, title, content, selector, placement, target_url, click_selector, step_type, video_url, sort_order, created_at, updated_at) VALUES

-- ============================================================
-- Tour: Certification (03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd)
-- ============================================================
('b8308b9d-df62-49f4-8d84-afadb1f5c377', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Employee Certifcation', 'click on Employee Certification', '.nepTileB5138C665FA7711FE10000000AC6024A', 'bottom', NULL, NULL, 'standard', NULL, 0, '2026-03-13T21:06:08.747187+00:00', '2026-03-14T14:42:35.562736+00:00'),
('7edd2302-4bf2-41a8-9a83-a2f1fa07753d', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Language', 'Select the certificate language', '[id$="--SimpleForm2"] > div > div > div > div > div > div > div > div', 'bottom', 'https://extranet.isdb.org/neptune/webapp/?sap-client=100&launchpad=ESS#StaffCertificates-Display', NULL, 'standard', NULL, 1, '2026-03-14T14:42:41.698334+00:00', '2026-03-14T14:50:05.568581+00:00'),
('56b078f8-3ca4-44dd-8e75-e29fe21a1544', '03c6f5d1-3b1e-45e0-8732-4d7ea1daa0bd', 'Type', 'Choose the form type', '[id$="--SimpleForm4"] div:nth-of-type(3)', 'bottom', NULL, '[id$="--RadioEnglish-Button"]', 'standard', NULL, 2, '2026-03-14T14:44:20.063157+00:00', '2026-03-14T14:45:27.590602+00:00'),

-- ============================================================
-- Tour: Apply for a Job (7add15c1-0e25-4ecf-ba20-9b5f1466486a)
-- ============================================================
('01d77f15-de74-49a4-bfa4-3695ab642e5b', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Welcome to IsDB Careers', 'Welcome! This guide will show you how to search and apply for a job at the Islamic Development Bank.', '', 'center', 'https://careers.isdb.org/', NULL, 'standard', NULL, 0, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('ed694e7c-7eb7-4510-9e7c-d6b938a85e47', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Open Job Opportunities', 'Click here to explore current job opportunities available at IsDB.', 'a[href*=''search'']', 'bottom', 'https://careers.isdb.org/', NULL, 'standard', NULL, 1, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('9fd9795e-f65c-4503-a0fc-2514d7b736b8', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Search Jobs', 'Use this search field to find jobs by keyword, department, or location.', 'input[type=''search'']', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 2, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('1f3dddec-1dd7-4782-a90e-467cd328337d', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Apply Filters', 'You can refine your search using filters such as location, category, or posting date.', '.filters, .search-filters', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 3, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('893de23a-7fb3-4304-af61-f381605ebfc3', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Select a Job', 'Click a job title to view the full description and requirements.', 'a[href*=''/job/'']', 'bottom', 'https://careers.isdb.org/search', NULL, 'standard', NULL, 4, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('86e1ae72-ff32-4948-b0e9-9bbdbd7bada3', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Review Job Description', 'Review the job responsibilities, qualifications, and required skills.', '.job-description, #jobDescriptionText', 'bottom', NULL, NULL, 'standard', NULL, 5, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('184ffdc8-3562-44ad-b654-e4a183a8d83f', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Apply Now', 'If this role matches your skills and experience, click Apply to start your application.', 'a[data-ph-at-id=''apply-button''], .apply-button', 'bottom', NULL, NULL, 'standard', NULL, 6, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('05156901-9901-45a2-928f-16604473c4be', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Sign In or Register', 'Sign in or create an account to continue the application process.', 'input[type=''email'']', 'bottom', NULL, NULL, 'standard', NULL, 7, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('f7a51a71-6f7a-4a47-b037-d11ebedcb327', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Upload CV', 'Upload your resume or CV so the recruitment team can review your experience.', 'input[type=''file'']', 'bottom', NULL, NULL, 'standard', NULL, 8, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),
('a716f369-7682-4cf3-b1a9-50fa7862838d', '7add15c1-0e25-4ecf-ba20-9b5f1466486a', 'Submit Application', 'Once all required information is completed, submit your application.', 'button[type=''submit'']', 'bottom', NULL, NULL, 'standard', NULL, 9, '2026-03-14T17:38:56.262058+00:00', '2026-03-14T17:38:56.262058+00:00'),

-- ============================================================
-- Tour: Remote Work Request (764079c0-16a7-49b0-a38e-504683349cfe)
-- ============================================================
('97ee4d4e-5a72-4e66-bf8d-9c8e1b5c8a01', '764079c0-16a7-49b0-a38e-504683349cfe', 'Remote Work', 'Click on Remote Work Request tile to begin.', '.nepTile0050568C277E1EDBBCBC8A5887B1408A', 'bottom', NULL, NULL, 'standard', NULL, 0, '2026-03-12T21:32:35.601995+00:00', '2026-03-12T21:32:35.601995+00:00'),

-- ============================================================
-- Tour: Digital Business Card (bc4e9cbe-8982-4c54-bc1e-5577a787715e)
-- ============================================================
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bc4e9cbe-8982-4c54-bc1e-5577a787715e', 'Digital Business Card', 'Click on Digital Business Card to begin.', '.nepTileDigitalBusinessCard', 'bottom', NULL, NULL, 'standard', NULL, 0, '2026-03-12T21:41:33.693382+00:00', '2026-03-12T21:41:33.693382+00:00'),

-- ============================================================
-- Tour: Career Portal Overview (c47e5a30-7d51-421b-9d58-9a52a07f917f)
-- ============================================================
('c1d2e3f4-a5b6-7890-cdef-123456789abc', 'c47e5a30-7d51-421b-9d58-9a52a07f917f', 'Welcome to IsDB Careers Portal', 'Welcome! This overview will guide you through the main features of the IsDB Careers portal.', '', 'center', 'https://careers.isdb.org/', NULL, 'standard', NULL, 0, '2026-03-14T18:55:00.111917+00:00', '2026-03-14T18:55:00.111917+00:00'),

-- ============================================================
-- Tour: Create Job Alert (dfb065b7-3d3d-43c2-9262-685fb2177e7e)
-- ============================================================
('d1e2f3a4-b5c6-7890-defa-234567890bcd', 'dfb065b7-3d3d-43c2-9262-685fb2177e7e', 'Job Alerts', 'Learn how to set up job alerts to get notified about new opportunities.', '', 'center', 'https://careers.isdb.org/', NULL, 'standard', NULL, 0, '2026-03-14T17:38:57.550952+00:00', '2026-03-14T17:38:57.550952+00:00'),

-- ============================================================
-- Tour: Join Talent Community (18b12ede-2352-48b7-9a55-64891a4ed194)
-- ============================================================
('e1f2a3b4-c5d6-7890-efab-345678901cde', '18b12ede-2352-48b7-9a55-64891a4ed194', 'Join Talent Community', 'Learn how to join the IsDB Talent Community to stay connected with future opportunities.', '', 'center', 'https://careers.isdb.org/', NULL, 'standard', NULL, 0, '2026-03-14T17:38:56.481911+00:00', '2026-03-14T17:38:56.481911+00:00')

ON CONFLICT (id) DO NOTHING;
