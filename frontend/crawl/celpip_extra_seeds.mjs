export const extraSeeds = [
  {
    type: 'Problem Solving',
    title: 'Lost Library Book',
    transcript: `Hi, I received an email saying a book I borrowed is overdue, but I’m sure I returned it last week. — I can check that for you. What is your library card number? — It is nine nine four two. — Thank you. The system shows "The Modern History" was due on Tuesday and has not been checked back in. — I dropped it in the return bin outside on Monday evening. — Ah, our outside bin jammed over the weekend and we are still processing that pile manually. Let me check the cart. Yes, here it is. — So I won't have to pay a late fee? — No, I will backdate the return to Monday, so the two-dollar fee is removed. — Thank you. — Is there anything else? — Actually, yes. Can I renew my other book, "Basic Economics"? — Let me see. I'm sorry, another patron placed a hold on it, so it cannot be renewed. — Oh, when is it due? — It is due tomorrow. — I'll bring it in tomorrow then. Thanks for your help.`,
    q: [
      ['Why is the patron speaking to the librarian?', 'He received an overdue notice for a returned book.', ['He wants to borrow a new book.', 'He lost his library card.', 'He wants to pay a fee.'], 'easy'],
      ['What does the librarian ask for?', 'His library card number.', ['The book title.', 'His phone number.', 'His ID.'], 'easy'],
      ['Where did the patron return the book?', 'In the return bin outside.', ['At the front desk.', 'By mail.', 'At another branch.'], 'medium'],
      ['Why was the book not checked in?', 'The outside bin jammed and staff are processing it manually.', ['The patron returned it to the wrong place.', 'The system was down.', 'The book was damaged.'], 'medium'],
      ['What will the librarian do about the fee?', 'Backdate the return to remove the fee.', ['Charge half the fee.', 'Ask the manager for a refund.', 'Make him pay the two dollars.'], 'medium'],
      ['What else does the patron want to do?', 'Renew another book.', ['Borrow a DVD.', 'Get a new card.', 'Reserve a computer.'], 'medium'],
      ['Why cannot the other book be renewed?', 'Another patron placed a hold on it.', ['He has too many books.', 'It is too popular.', 'The library is closing.'], 'hard'],
      ['What will the patron do next?', 'Bring the other book in tomorrow.', ['Keep the book for a week.', 'Pay for the book.', 'Wait for an email.'], 'hard']
    ]
  },
  {
    type: 'Daily Life Conversation',
    title: 'Planning a Birthday Dinner',
    transcript: `We need to finalize the restaurant for Sarah's birthday dinner this Saturday. — Did we decide between the Italian place and the sushi restaurant? — Sarah loves sushi, but her sister is allergic to seafood, so Italian is safer. — Good point. The Italian place downtown, Luigi's? — Yes, Luigi's. I checked, and they have a large table available at seven. — Perfect. Should I order a cake ahead of time? — The restaurant said we can bring our own cake, but there is a ten-dollar plating fee. — That's fine, the bakery next to my work makes great chocolate cakes. I will pick one up Friday. — Great. I will call Luigi's now and make the reservation for eight people.`,
    q: [
      ['What are the speakers planning?', 'A birthday dinner for Sarah.', ['A surprise party.', 'A graduation lunch.', 'A family reunion.'], 'easy'],
      ['Why do they choose the Italian restaurant?', `Sarah's sister is allergic to seafood.`, ['It is cheaper.', 'Sarah prefers Italian food.', 'It is closer to home.'], 'medium'],
      ['What time is the table available?', 'Seven.', ['Six.', 'Eight.', 'Nine.'], 'easy'],
      ['What is the rule about bringing a cake?', `The restaurant charges a ten-dollar plating fee.`, ['They are not allowed to bring one.', `They must buy the restaurant's cake.`, 'It is completely free.'], 'medium'],
      ['What will the second speaker do on Friday?', 'Pick up a chocolate cake from a bakery.', ['Call the restaurant.', 'Invite the guests.', 'Buy a gift for Sarah.'], 'hard']
    ]
  },
  {
    type: 'Information',
    title: 'Commuter Train Update',
    transcript: `Attention passengers on the Blue Line. Due to scheduled track maintenance, all northbound trains will experience delays of approximately fifteen minutes starting at 10 a.m. today. The maintenance will last until 3 p.m. During this time, express trains will make all local stops, so please plan for extra travel time. Southbound trains are running on their normal schedule. For passengers needing to reach the airport, a free shuttle bus is available outside the main terminal to bypass the delayed section. We apologize for the inconvenience and appreciate your patience while we improve our rail system.`,
    q: [
      ['What is the announcement about?', 'Delays on the northbound Blue Line trains.', ['A new train schedule.', 'A station closure.', 'Increased ticket prices.'], 'easy'],
      ['Why are the trains delayed?', 'Scheduled track maintenance.', ['Bad weather.', 'A train breakdown.', 'A power outage.'], 'easy'],
      ['How long will the delays last?', 'From 10 a.m. until 3 p.m.', ['All day.', 'Until tomorrow morning.', 'Only during rush hour.'], 'medium'],
      ['What change is happening to express trains?', 'They will make all local stops.', ['They are cancelled.', 'They will run faster.', 'They will cost more.'], 'medium'],
      ['What is the status of southbound trains?', 'They are running on their normal schedule.', ['They are also delayed.', 'They are replaced by buses.', 'They are running backwards.'], 'medium'],
      ['What is provided for passengers going to the airport?', 'A free shuttle bus outside the main terminal.', ['A discounted taxi ride.', 'A special express train.', 'A refund on their ticket.'], 'hard']
    ]
  },
  {
    type: 'News Item',
    title: 'Local Library Renovations',
    transcript: `In local news, the downtown public library will close for major renovations starting next Monday. City officials say the fifty-year-old building desperately needs an upgraded heating system and a new roof. The project is expected to take six months, costing roughly two million dollars. While the main branch is closed, its collection will be temporarily moved to the community center on Pine Street, where residents can still borrow and return books. The library's digital services, including e-books and online tutoring, will remain available 24/7 without interruption. The grand reopening is scheduled for early spring.`,
    q: [
      ['What is happening to the downtown public library?', 'It is closing for major renovations.', ['It is moving permanently.', 'It is expanding its parking lot.', 'It is hosting a book sale.'], 'easy'],
      ['What specific upgrades are needed?', 'An upgraded heating system and a new roof.', ['New computers and desks.', 'More bookshelves and lighting.', `A larger children's area.`], 'medium'],
      ['How long is the project expected to take?', 'Six months.', ['Two months.', 'One year.', 'A few weeks.'], 'easy'],
      ['Where can residents borrow books during the closure?', 'At the community center on Pine Street.', ['At the city hall.', 'At local schools.', 'They cannot borrow books.'], 'medium'],
      ['What service will remain uninterrupted?', `The library's digital services.`, ['Meeting room rentals.', 'The cafe.', 'In-person workshops.'], 'hard']
    ]
  },
  {
    type: 'Discussion',
    title: 'Organizing a Charity Run',
    transcript: `We need to finalize the route for next month's charity run. — Last year we did the 5K through the city park, but it got a bit crowded on the narrow paths. — I agree. What if we route it along the waterfront this year? The paths are wider. — The waterfront is beautiful, but we would need to get city permits to close parts of Water Street, which can take weeks. — I already checked with the city, and they can expedite the permit for charity events if we apply by this Friday. — That's great news. What about parking? The waterfront lots fill up fast on weekends. — We could rent the high school parking lot; it's only a ten-minute walk from the starting line. — Perfect. I can contact the school principal today to ask about the lot. — Okay, I will fill out the permit application for the waterfront route. Let's aim to submit it by Thursday morning. — Sounds like a plan. I will also start updating the website with the new route details once the permit is approved.`,
    q: [
      ['What are the speakers discussing?', `The route for next month's charity run.`, ['Buying running shoes.', 'Cancelling an event.', 'Training for a marathon.'], 'easy'],
      ['What was the problem with last year\'s route?', 'The paths in the city park were too narrow and crowded.', ['It was too long.', 'There were no bathrooms.', 'It was too steep.'], 'medium'],
      ['Where is the proposed new route?', 'Along the waterfront.', ['Through the forest.', 'Around the stadium.', 'In the suburbs.'], 'easy'],
      ['What is the challenge with the waterfront route?', 'They need city permits to close parts of Water Street.', ['It is too windy.', 'There are too many hills.', 'It costs too much money.'], 'medium'],
      ['How can they solve the permit issue?', 'The city can expedite it if they apply by this Friday.', ['They can skip the permit.', 'They can run at night.', 'They can pay a fine.'], 'medium'],
      ['What is the suggested solution for parking?', 'Renting the high school parking lot.', ['Using street parking.', 'Asking participants to take the bus.', 'Building a new lot.'], 'medium'],
      ['What will the second speaker do today?', 'Contact the school principal to ask about the lot.', ['Call the police station.', 'Submit the permit.', 'Update the website.'], 'hard'],
      ['When will the website be updated?', 'Once the permit is approved.', ['Immediately.', 'After the race.', 'By Friday evening.'], 'hard']
    ]
  },
  {
    type: 'Viewpoints',
    title: 'Four-Day Work Week',
    transcript: `Our station recently asked listeners for their thoughts on moving to a four-day work week, where employees work thirty-two hours but get paid for forty. Supporters were enthusiastic. They argued that a shorter work week greatly improves work-life balance and reduces burnout. One manager noted that since adopting the model, her team's productivity actually increased because they were more focused during office hours. However, business owners were more skeptical. Some argued that for customer-facing industries like retail or healthcare, closing for an extra day is impossible, meaning they would have to hire more staff to cover the gaps. A few economists warned that the extra hiring costs could be passed on to consumers as higher prices. Ultimately, many agreed it might work well for office jobs, but not for every sector.`,
    q: [
      ['What is the topic of the discussion?', 'Moving to a four-day work week.', ['Raising the minimum wage.', 'Working from home permanently.', 'Extending holiday leave.'], 'easy'],
      ['What is the main argument from supporters?', 'It improves work-life balance and reduces burnout.', ['It saves money on commuting.', 'It creates more jobs.', 'It helps the environment.'], 'medium'],
      ['What did one manager notice after adopting the model?', `Her team's productivity increased because they were more focused.`, ['Her team missed deadlines.', 'Employees were unhappy.', 'They had to work longer hours.'], 'medium'],
      ['Why are some business owners skeptical?', 'Customer-facing industries cannot easily close for an extra day.', ['They think employees are lazy.', 'The software cannot handle it.', 'Office rent is too expensive.'], 'medium'],
      ['What did economists warn about?', 'Extra hiring costs could be passed on to consumers as higher prices.', ['The stock market would crash.', 'People would spend less money.', 'Taxes would increase.'], 'hard'],
      ['What was the general consensus at the end?', 'It might work for office jobs, but not every sector.', ['It should be mandatory for all.', 'It is a terrible idea.', 'It is already the law.'], 'hard']
    ]
  }
];
