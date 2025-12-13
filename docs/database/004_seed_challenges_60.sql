-- Seed 60 challenges: 15 animals, 15 sport, 15 nature, 15 surprise
-- Using Unsplash for high-quality placeholder images

-- ANIMALS (15)
INSERT INTO admin_challenges (title, description, image_url, goal_steps, difficulty, category) VALUES
('Lion King', 'Majestic lion in the wild', 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800', 10000, 'medium', 'animals'),
('Elephant Walk', 'Giant elephant on safari', 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800', 15000, 'medium', 'animals'),
('Eagle Eye', 'Soaring eagle in flight', 'https://images.unsplash.com/photo-1598610992066-347c1e6bb9b5?w=800', 8000, 'easy', 'animals'),
('Panda Paradise', 'Cute panda eating bamboo', 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800', 12000, 'medium', 'animals'),
('Tiger Power', 'Powerful tiger portrait', 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800', 20000, 'hard', 'animals'),
('Dolphin Dance', 'Dolphins jumping in ocean', 'https://images.unsplash.com/photo-1607153333879-c174d265f1d2?w=800', 10000, 'medium', 'animals'),
('Penguin March', 'Penguins on ice', 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=800', 8000, 'easy', 'animals'),
('Giraffe Height', 'Tall giraffe in savanna', 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=800', 15000, 'medium', 'animals'),
('Wolf Pack', 'Wolf howling at moon', 'https://images.unsplash.com/photo-1548366086-7f1b76106622?w=800', 18000, 'hard', 'animals'),
('Butterfly Garden', 'Colorful butterflies', 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800', 5000, 'easy', 'animals'),
('Koala Dreams', 'Sleeping koala bear', 'https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=800', 7000, 'easy', 'animals'),
('Shark Week', 'Great white shark underwater', 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?w=800', 25000, 'hard', 'animals'),
('Owl Wisdom', 'Wise owl at night', 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=800', 10000, 'medium', 'animals'),
('Monkey Business', 'Playful monkeys', 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=800', 12000, 'medium', 'animals'),
('Zebra Stripes', 'Zebra in the wild', 'https://images.unsplash.com/photo-1501706362039-c06b2d715385?w=800', 10000, 'medium', 'animals');

-- SPORT (15)
INSERT INTO admin_challenges (title, description, image_url, goal_steps, difficulty, category) VALUES
('Soccer Champion', 'Football on grass field', 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=800', 15000, 'medium', 'sport'),
('Basketball Star', 'Basketball court action', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800', 12000, 'medium', 'sport'),
('Tennis Ace', 'Tennis ball on court', 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800', 10000, 'medium', 'sport'),
('Marathon Runner', 'Running track finish line', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800', 30000, 'hard', 'sport'),
('Cycling Tour', 'Mountain bike trail', 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800', 20000, 'hard', 'sport'),
('Yoga Flow', 'Peaceful yoga pose', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800', 8000, 'easy', 'sport'),
('Swimming Pool', 'Olympic swimming pool', 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800', 12000, 'medium', 'sport'),
('Boxing Ring', 'Boxing gloves close-up', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800', 15000, 'hard', 'sport'),
('Skateboard Pro', 'Skateboard tricks', 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=800', 10000, 'medium', 'sport'),
('Golf Green', 'Golf ball on green', 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800', 8000, 'easy', 'sport'),
('Surfing Waves', 'Surfer on ocean wave', 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800', 18000, 'hard', 'sport'),
('Climbing Wall', 'Rock climbing indoor', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800', 15000, 'hard', 'sport'),
('Volleyball Match', 'Beach volleyball', 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800', 10000, 'medium', 'sport'),
('Baseball Diamond', 'Baseball and glove', 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800', 12000, 'medium', 'sport'),
('Fitness Power', 'Gym dumbbells', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800', 10000, 'medium', 'sport');

-- NATURE (15)
INSERT INTO admin_challenges (title, description, image_url, goal_steps, difficulty, category) VALUES
('Mountain Peak', 'Snow-capped mountain summit', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 25000, 'hard', 'nature'),
('Forest Path', 'Mysterious forest trail', 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800', 15000, 'medium', 'nature'),
('Ocean Sunset', 'Golden hour at beach', 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800', 10000, 'easy', 'nature'),
('Waterfall Wonder', 'Majestic waterfall', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800', 18000, 'hard', 'nature'),
('Desert Dunes', 'Sahara desert landscape', 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800', 20000, 'hard', 'nature'),
('Cherry Blossoms', 'Pink sakura flowers', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800', 8000, 'easy', 'nature'),
('Northern Lights', 'Aurora borealis sky', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800', 15000, 'medium', 'nature'),
('Tropical Paradise', 'Palm trees and beach', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800', 10000, 'easy', 'nature'),
('Canyon Views', 'Grand canyon landscape', 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800', 22000, 'hard', 'nature'),
('Lake Reflection', 'Mirror lake mountains', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 12000, 'medium', 'nature'),
('Autumn Colors', 'Fall foliage forest', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 10000, 'medium', 'nature'),
('Starry Night', 'Milky way galaxy', 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800', 15000, 'medium', 'nature'),
('Rainforest Green', 'Lush jungle vegetation', 'https://images.unsplash.com/photo-1516214104703-d870798883c5?w=800', 18000, 'hard', 'nature'),
('Lavender Fields', 'Purple lavender rows', 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=800', 8000, 'easy', 'nature'),
('Ice Glacier', 'Blue glacier ice formation', 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800', 20000, 'hard', 'nature');

-- SURPRISE (15) - Mix of everything interesting
INSERT INTO admin_challenges (title, description, image_url, goal_steps, difficulty, category) VALUES
('City Lights', 'Urban skyline at night', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800', 12000, 'medium', 'surprise'),
('Coffee Break', 'Perfect cup of coffee', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800', 5000, 'easy', 'surprise'),
('Hot Air Balloon', 'Colorful balloons in sky', 'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=800', 15000, 'medium', 'surprise'),
('Rainbow Magic', 'Double rainbow after rain', 'https://images.unsplash.com/photo-1501999635878-71cb5379c2d8?w=800', 10000, 'medium', 'surprise'),
('Ancient Temple', 'Historic temple ruins', 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800', 18000, 'hard', 'surprise'),
('Vintage Car', 'Classic automobile', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800', 10000, 'medium', 'surprise'),
('Book Library', 'Old books on shelves', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', 8000, 'easy', 'surprise'),
('Lighthouse Beacon', 'Coastal lighthouse', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 12000, 'medium', 'surprise'),
('Street Art', 'Colorful graffiti wall', 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800', 10000, 'medium', 'surprise'),
('Music Festival', 'Concert crowd energy', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', 15000, 'hard', 'surprise'),
('Space Shuttle', 'Rocket launch to space', 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800', 25000, 'hard', 'surprise'),
('Fairy Lights', 'Magical string lights', 'https://images.unsplash.com/photo-1513735539099-cf6e5d583ef2?w=800', 7000, 'easy', 'surprise'),
('Ferris Wheel', 'Amusement park ride', 'https://images.unsplash.com/photo-1513735539099-cf6e5d583ef2?w=800', 10000, 'medium', 'surprise'),
('Golden Gate', 'Famous bridge landmark', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', 20000, 'hard', 'surprise'),
('Fireworks Show', 'Colorful fireworks display', 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800', 15000, 'medium', 'surprise');
