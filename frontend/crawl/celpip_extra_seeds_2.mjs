export const extraSeeds2 = [
  {
    type: 'Problem Solving',
    title: 'Incorrect Coffee Order',
    transcript: `Excuse me, I think there is a mistake with my order. I ordered a large iced latte with oat milk, but this is a hot latte with regular milk. — I am so sorry about that. It is really busy this morning and we got the cups mixed up. — That is okay, but I am lactose intolerant so I really cannot drink this. — Of course. Let me remake that for you right away. A large iced latte with oat milk, right? — Yes, please. And could you add an extra shot of espresso? — I will add that for free to make up for the wait. — Thank you. What should I do with this hot latte? — You can just leave it on the counter; I will throw it away. — I am also in a bit of a rush to get to work. — Your new drink will be ready at the end of the bar in two minutes.`,
    q: [
      ['Why is the customer talking to the barista?', 'There is a mistake with his coffee order.', ['He wants to apply for a job.', 'He lost his wallet.', 'He wants to buy some beans.'], 'easy'],
      ['What was wrong with the drink?', 'It was hot and had regular milk instead of oat milk.', ['It was too small and too sweet.', 'It was spilled on the counter.', 'It was the wrong flavour entirely.'], 'medium'],
      ['Why is the type of milk important to the customer?', 'He is lactose intolerant.', ['He prefers the taste of regular milk.', 'He is on a diet.', 'Oat milk is cheaper.'], 'medium'],
      ['What does the barista offer to do?', 'Remake the drink right away.', ['Give him a refund.', 'Ask him to wait in line again.', 'Offer him a tea.'], 'easy'],
      ['What extra item is added for free?', 'An extra shot of espresso.', ['A pastry.', 'A bottle of water.', 'A second latte.'], 'medium'],
      ['What should the customer do with the wrong drink?', 'Leave it on the counter for the barista to throw away.', ['Give it to someone else.', 'Drink it anyway.', 'Take it back to his table.'], 'medium'],
      ['Why does the customer mention he is in a rush?', 'He needs to get to work.', ['He is catching a train.', 'His friend is waiting outside.', 'He has an appointment.'], 'hard'],
      ['How long will it take for the new drink to be ready?', 'Two minutes.', ['Five minutes.', 'Ten minutes.', 'One minute.'], 'hard']
    ]
  },
  {
    type: 'Daily Life Conversation',
    title: 'Choosing a Movie',
    transcript: `Are you still coming over for movie night tonight? — Yes! Should we watch the new sci-fi movie or that comedy you mentioned? — I am feeling a bit stressed from work, so I would prefer something light like the comedy. — The comedy sounds perfect. What time should I come over? — Come around seven. We can order pizza before we start the movie. — Great. I will bring some popcorn and soda. — Oh, can you get diet soda? I am trying to cut back on sugar. — Sure, no problem. I will grab some from the store on my way.`,
    q: [
      ['What are the speakers discussing?', 'What to do for movie night.', ['Going out to the theater.', 'Renting a video game.', 'Studying for an exam.'], 'easy'],
      ['Which type of movie do they decide to watch?', 'A comedy.', ['A sci-fi movie.', 'A documentary.', 'A horror movie.'], 'easy'],
      ['Why does the first speaker prefer a comedy?', 'He is feeling stressed from work and wants something light.', ['He hates sci-fi movies.', 'He has already seen the sci-fi movie.', 'It is shorter.'], 'medium'],
      ['What time should the second speaker arrive?', 'Around seven.', ['At eight.', 'At six.', 'Whenever he is ready.'], 'easy'],
      ['What will the second speaker bring?', 'Popcorn and diet soda.', ['Pizza and beer.', 'Candy and water.', 'Nothing, he is just bringing himself.'], 'medium']
    ]
  },
  {
    type: 'Information',
    title: 'New Recycling Rules',
    transcript: `Attention all building residents. The city has updated its recycling guidelines, and we must comply starting next Monday. All glass bottles and jars must now be separated into the new blue bins located by the back exit. Please make sure to rinse them first. Cardboard and paper will continue to go in the green bins, but all cardboard boxes must be flattened to save space. Plastic bags are no longer accepted in any recycling bin and must be thrown in the regular garbage. Failure to follow these rules could result in a fine for the building, so your cooperation is essential. If you have any questions, please see the superintendent in apartment 1A.`,
    q: [
      ['What is the announcement about?', 'Updated recycling guidelines for the building.', ['A new garbage collection schedule.', 'A building renovation.', 'A city-wide ban on plastic.'], 'easy'],
      ['When do the new rules start?', 'Next Monday.', ['Immediately.', 'Next month.', 'At the end of the year.'], 'easy'],
      ['Where should glass bottles and jars go?', 'Into the new blue bins by the back exit.', ['Into the green bins.', 'Into the regular garbage.', 'They should be left in the hallway.'], 'medium'],
      ['What must residents do to the cardboard boxes?', 'Flatten them to save space.', ['Tear them into small pieces.', 'Tie them with string.', 'Leave them whole.'], 'medium'],
      ['What is the new rule regarding plastic bags?', 'They are no longer accepted in recycling and must go in the garbage.', ['They must be washed first.', 'They go in the blue bins.', 'They go in the green bins.'], 'hard'],
      ['What could happen if the rules are not followed?', 'The building could receive a fine.', ['Residents will be evicted.', 'Garbage collection will stop.', 'Nothing will happen.'], 'hard']
    ]
  },
  {
    type: 'News Item',
    title: 'Farmers Market Moving',
    transcript: `In local community news, the popular Saturday Farmers Market is relocating. For the past five years, the market has operated in the Town Hall parking lot, but starting next month, it will move to the larger fairgrounds on the edge of town. Organizers say the move will allow them to double the number of vendors, bringing in more fresh produce, local crafts, and food trucks. Additionally, the new location offers free parking for all visitors, resolving a frequent complaint about the downtown site. The market will also extend its hours, staying open until 3 PM instead of closing at noon. A special opening ceremony with live music is planned for the first Saturday at the new venue.`,
    q: [
      ['What is happening to the Farmers Market?', 'It is relocating to the fairgrounds.', ['It is closing down permanently.', 'It is moving to Sunday.', 'It is changing its name.'], 'easy'],
      ['Where was the market located for the past five years?', 'In the Town Hall parking lot.', ['At the fairgrounds.', 'In the city park.', 'On Main Street.'], 'medium'],
      ['What is one benefit of the new location?', 'It allows them to double the number of vendors.', ['It is closer to downtown.', 'It is indoors.', 'It has a playground.'], 'medium'],
      ['How does the new location resolve a frequent complaint?', 'It offers free parking for all visitors.', ['It is less noisy.', 'It is open every day.', 'It accepts credit cards.'], 'hard'],
      ['What is changing about the market\'s hours?', 'It will stay open until 3 PM.', ['It will open earlier.', 'It will close at noon.', 'It will only be open in the morning.'], 'hard']
    ]
  },
  {
    type: 'Discussion',
    title: 'Planning a Workshop',
    transcript: `We need to figure out the schedule for the upcoming graphic design workshop. — I was thinking a full-day session on Saturday, maybe nine to five. — A full day is a lot of information to absorb at once. What if we split it into two half-days over the weekend? — That is a good idea. We could do one to five on both Saturday and Sunday. — Let's do ten to two instead. That way, people still have their afternoons free. — Ten to two works better. Should we provide lunch? — If we run through lunch, we should definitely provide sandwiches and drinks. It will keep the energy up. — Okay, I will contact the caterer today to get a quote. — Do we have enough laptops for everyone, or should they bring their own? — The computer lab only has fifteen, and we expect twenty people. — Then we must ask them to bring their own laptops in the registration email. — Agreed. I will draft the email and send it out by tomorrow afternoon.`,
    q: [
      ['What is the main topic of the discussion?', 'The schedule and logistics for a graphic design workshop.', ['Buying new laptops.', 'Planning a lunch menu.', 'Hiring a caterer.'], 'easy'],
      ['What is the initial suggestion for the schedule?', 'A full-day session on Saturday, from nine to five.', ['Two half-days over the weekend.', 'An evening class.', 'A weekday morning session.'], 'medium'],
      ['Why do they decide against a full-day session?', 'It is a lot of information to absorb at once.', ['It is too expensive.', 'The instructor is busy.', 'The room is not available.'], 'medium'],
      ['What is the final agreed-upon schedule?', 'Two half-days from ten to two on Saturday and Sunday.', ['Saturday from nine to five.', 'Sunday from one to five.', 'Both days from one to five.'], 'hard'],
      ['Why do they decide to provide lunch?', 'To keep the energy up since the workshop runs through lunchtime.', ['Because it is a requirement.', 'To use up the budget.', 'To make the workshop longer.'], 'medium'],
      ['What will the first speaker do today?', 'Contact the caterer to get a quote.', ['Draft the registration email.', 'Buy laptops.', 'Cancel the workshop.'], 'hard'],
      ['What is the issue with the laptops?', 'The lab only has fifteen, but twenty people are expected.', ['They are all broken.', 'They do not have the right software.', 'They are too slow.'], 'medium'],
      ['What must participants be asked to do?', 'Bring their own laptops.', ['Pay an extra fee.', 'Bring their own lunch.', 'Arrive early.'], 'hard']
    ]
  },
  {
    type: 'Viewpoints',
    title: 'Online Shopping Taxes',
    transcript: `Our panel today debated the proposal to introduce a new tax on all online shopping deliveries to fund local infrastructure. Proponents of the tax argued that the massive increase in delivery trucks is damaging local roads and increasing pollution, so the companies and consumers driving this trend should pay for the repairs. Some environmentalists added that the tax might encourage people to bundle their orders instead of getting multiple small deliveries. Opponents, however, strongly disagreed. They argued that the tax would disproportionately hurt lower-income families who rely on online shopping for affordable goods. Small business owners also expressed concern, stating that adding an extra fee at checkout would lead to fewer sales and hurt their ability to compete with large brick-and-mortar stores. The debate highlighted the difficulty of balancing infrastructure needs with economic fairness.`,
    q: [
      ['What is the proposed policy being debated?', 'A new tax on all online shopping deliveries.', ['A ban on delivery trucks.', 'Free shipping for everyone.', 'A tax on brick-and-mortar stores.'], 'easy'],
      ['What is the purpose of the proposed tax?', 'To fund local infrastructure repairs.', ['To build more warehouses.', 'To pay delivery drivers more.', 'To lower income taxes.'], 'medium'],
      ['What is a key argument from the proponents of the tax?', 'Delivery trucks are damaging roads and increasing pollution.', ['Online shopping is too fast.', 'People buy too much.', 'Delivery drivers need better working conditions.'], 'medium'],
      ['What do environmentalists hope the tax will achieve?', 'It might encourage people to bundle their orders.', ['It will ban plastic packaging.', 'It will force companies to use electric trucks.', 'It will stop online shopping entirely.'], 'hard'],
      ['Who do opponents argue will be hurt most by the tax?', 'Lower-income families who rely on affordable goods.', ['Wealthy individuals.', 'Large corporations.', 'The government.'], 'medium'],
      ['What is the concern of small business owners?', 'The extra fee will lead to fewer sales and hurt their ability to compete.', ['They will have to pay the tax directly.', 'They will not be able to afford delivery trucks.', 'They will have to close their physical stores.'], 'hard']
    ]
  }
];
