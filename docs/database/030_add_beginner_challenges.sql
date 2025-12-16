-- Add more beginner-friendly challenges (under 5000 steps)
-- Perfect for kids, elderly, or people starting their fitness journey

INSERT INTO admin_challenges (title, description, image_url, goal_steps, difficulty, category) VALUES
-- ANIMALS - Beginner friendly (3-5k steps)
('Baby Duck Walk', 'Cute ducklings following mom', 'https://images.unsplash.com/photo-1518331239100-e1c4c4c75d57?w=800', 3000, 'easy', 'animals'),
('Bunny Hop', 'Adorable rabbit in grass', 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800', 3500, 'easy', 'animals'),
('Puppy Play', 'Happy puppy playing', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800', 4000, 'easy', 'animals'),
('Kitten Cuddle', 'Sleepy kitten resting', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800', 3500, 'easy', 'animals'),
('Turtle Pace', 'Slow and steady turtle', 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800', 2500, 'easy', 'animals'),

-- NATURE - Short walks (3-5k steps)
('Garden Stroll', 'Beautiful flower garden', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', 3000, 'easy', 'nature'),
('Park Bench', 'Peaceful park scene', 'https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=800', 3500, 'easy', 'nature'),
('Sunset Walk', 'Gentle evening sunset', 'https://images.unsplash.com/photo-1495954484750-af469f2f9be5?w=800', 4000, 'easy', 'nature'),
('Spring Flowers', 'Colorful tulips blooming', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800', 3000, 'easy', 'nature'),
('Peaceful Pond', 'Calm water reflection', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800', 4500, 'easy', 'nature'),

-- SPORT - Light activities (3-5k steps)
('Morning Stretch', 'Gentle stretching routine', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800', 3000, 'easy', 'sport'),
('Easy Bike Ride', 'Leisurely cycling path', 'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=800', 4000, 'easy', 'sport'),
('Light Jog', 'Beginner jogging trail', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800', 4500, 'easy', 'sport'),
('Dance Fun', 'Simple dance moves', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800', 3500, 'easy', 'sport'),

-- SURPRISE - Fun & easy (3-5k steps)
('Ice Cream Walk', 'Delicious ice cream cone', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800', 3000, 'easy', 'surprise'),
('Window Shopping', 'Colorful shop windows', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', 3500, 'easy', 'surprise'),
('Playground Visit', 'Fun playground equipment', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800', 4000, 'easy', 'surprise'),
('Photo Walk', 'Taking pictures around town', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800', 4500, 'easy', 'surprise');
