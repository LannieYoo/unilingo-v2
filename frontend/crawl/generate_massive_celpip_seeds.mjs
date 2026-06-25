export const generateMassiveSeeds = () => {
  const topics = [
    { type: 'Problem Solving', names: ['Internet Outage', 'Lost Baggage', 'Wrong Order', 'Missed Train', 'Broken Heater', 'Leaky Pipe', 'Delayed Delivery', 'Car Repair Issue', 'Double Billed', 'Stolen Wallet'] },
    { type: 'Daily Life Conversation', names: ['Weekend Plans', 'Buying a Gift', 'Organizing a Party', 'Choosing a Restaurant', 'Planning a Trip', 'Adopting a Pet', 'Joining a Gym', 'Learning a Language', 'Finding an Apartment', 'Moving Day'] },
    { type: 'Information', names: ['Museum Tour', 'Park Rules', 'Library Orientation', 'Public Transit Update', 'Recycling Program', 'Campus Safety', 'Health Clinic Hours', 'Community Garden', 'Volunteer Training', 'Local Festival'] },
    { type: 'News Item', names: ['City Hall Renovation', 'New Highway Construction', 'Local Election Results', 'Tech Startup Success', 'Weather Warning', 'Sports Team Victory', 'School Budget Cuts', 'Art Gallery Opening', 'Charity Marathon', 'Zoo Baby Animal'] },
    { type: 'Discussion', names: ['Working from Home', 'Four-Day Work Week', 'Online Learning', 'Plastic Bag Ban', 'Public Art Funding', 'Traffic Congestion', 'Tourism Impact', 'Social Media Use', 'Electric Vehicles', 'Urban Farming'] },
    { type: 'Viewpoints', names: ['Universal Basic Income', 'Space Exploration', 'Free Public Transit', 'Mandatory Voting', 'Healthcare Privatization', 'Censorship on Internet', 'Nuclear Energy', 'Genetic Engineering', 'Artificial Intelligence', 'Fast Fashion'] }
  ];

  const seeds = [];
  
  // We want to generate ~280 seeds. We can generate multiple variants for each topic.
  // 10 names * 6 types * 5 variants = 300 tests.
  
  const variants = ['(Variant A)', '(Variant B)', '(Variant C)', '(Variant D)', '(Variant E)'];
  
  topics.forEach(topicGroup => {
    topicGroup.names.forEach(name => {
      variants.forEach((variant, vIdx) => {
        let transcript = `This is an auto-generated audio transcript for ${name} ${variant}. The speakers will discuss various details regarding this topic. This is just a placeholder transcript for the mock test to ensure you have plenty of practice material.`;
        
        let qCount = 5;
        if (topicGroup.type === 'Problem Solving') qCount = 8;
        if (topicGroup.type === 'Information') qCount = 6;
        if (topicGroup.type === 'News Item') qCount = 5;
        if (topicGroup.type === 'Discussion') qCount = 8;
        if (topicGroup.type === 'Viewpoints') qCount = 6;
        
        const qList = [];
        for (let i = 1; i <= qCount; i++) {
          qList.push([
            `What is discussed in question ${i} about ${name}?`,
            `The correct answer for question ${i}.`,
            [
              `An incorrect distractor ${i}.1`,
              `Another incorrect distractor ${i}.2`,
              `A third incorrect option ${i}.3`
            ],
            i % 2 === 0 ? 'hard' : 'medium'
          ]);
        }
        
        seeds.push({
          type: topicGroup.type,
          title: `${name} ${variant}`,
          transcript: transcript,
          q: qList,
          source: 'AI Generated Mock'
        });
      });
    });
  });
  
  return seeds;
}
