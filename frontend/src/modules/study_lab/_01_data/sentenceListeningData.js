const EASY_SENTENCES = [
  ['I left my umbrella on the bus this morning.', '오늘 아침 버스에 우산을 두고 내렸어요.', '今天早上我把雨伞落在公交车上了。'],
  ['The library closes at six on Fridays.', '도서관은 금요일마다 6시에 문을 닫아요.', '图书馆星期五六点关门。'],
  ['Could you send me the meeting link again?', '회의 링크를 다시 보내 줄 수 있나요?', '你能再给我发一次会议链接吗？'],
  ['She bought fresh fruit for the picnic.', '그녀는 소풍에 가져갈 신선한 과일을 샀어요.', '她为野餐买了新鲜水果。'],
  ['The train leaves from platform four.', '기차는 4번 플랫폼에서 출발해요.', '火车从四号站台出发。'],
  ['Please charge your phone before we leave.', '출발하기 전에 휴대폰을 충전해 주세요.', '出发前请给手机充电。'],
  ['My appointment was moved to Thursday afternoon.', '제 예약이 목요일 오후로 변경됐어요.', '我的预约改到了星期四下午。'],
  ['The cafe is quieter after lunch.', '그 카페는 점심시간이 지나면 더 조용해요.', '那家咖啡馆午饭后更安静。'],
  ['He forgot to bring his student card.', '그는 학생증을 가져오는 걸 잊었어요.', '他忘了带学生证。'],
  ['We need to buy milk on the way home.', '집에 가는 길에 우유를 사야 해요.', '我们回家路上需要买牛奶。'],
  ['The elevator is not working today.', '오늘 엘리베이터가 작동하지 않아요.', '今天电梯不能用。'],
  ['Please write your name at the top of the form.', '양식 맨 위에 이름을 적어 주세요.', '请在表格顶部写上你的名字。'],
  ['I can meet you outside the station.', '역 밖에서 만날 수 있어요.', '我可以在车站外见你。'],
  ['The package arrived earlier than expected.', '택배가 예상보다 일찍 도착했어요.', '包裹比预期更早到了。'],
  ['She is saving money for a new laptop.', '그녀는 새 노트북을 사려고 돈을 모으고 있어요.', '她正在为买新笔记本电脑存钱。'],
  ['The store has a sale this weekend.', '그 가게는 이번 주말에 세일을 해요.', '那家商店这个周末有促销。'],
  ['I heard a strange noise in the hallway.', '복도에서 이상한 소리를 들었어요.', '我在走廊听到了奇怪的声音。'],
  ['The doctor asked me to drink more water.', '의사가 물을 더 많이 마시라고 했어요.', '医生让我多喝水。'],
  ['We should leave early because traffic is heavy.', '교통이 혼잡하니 일찍 출발하는 게 좋아요.', '交通很堵，我们最好早点出发。'],
  ['The class starts ten minutes later today.', '오늘 수업은 10분 늦게 시작해요.', '今天课程晚十分钟开始。'],
  ['Can you help me carry this box upstairs?', '이 상자를 위층으로 옮기는 것 좀 도와줄 수 있나요?', '你能帮我把这个箱子搬到楼上吗？'],
  ['I need a copy of the receipt for my records.', '기록용으로 영수증 사본이 필요해요.', '我需要一份收据副本做记录。'],
  ['The park is crowded on sunny weekends.', '날씨 좋은 주말에는 공원이 붐벼요.', '晴朗的周末公园很拥挤。'],
  ['Her flight was delayed by two hours.', '그녀의 비행기가 두 시간 지연됐어요.', '她的航班延误了两个小时。'],
  ['Please turn off the lights when you leave.', '나갈 때 불을 꺼 주세요.', '离开时请关灯。'],
  ['The new password must include a number.', '새 비밀번호에는 숫자가 포함되어야 해요.', '新密码必须包含数字。'],
  ['I found your notebook under the table.', '네 공책을 테이블 아래에서 찾았어요.', '我在桌子下面找到了你的笔记本。'],
  ['The weather report says it may snow tonight.', '일기예보에 따르면 오늘 밤 눈이 올 수도 있어요.', '天气预报说今晚可能下雪。'],
  ['We are meeting at the main entrance.', '우리는 정문에서 만날 거예요.', '我们在正门见面。'],
  ['The printer needs more paper.', '프린터에 종이가 더 필요해요.', '打印机需要加纸。'],
  ['I usually review new words before bed.', '저는 보통 자기 전에 새 단어를 복습해요.', '我通常睡前复习新单词。'],
  ['The restaurant accepts reservations online.', '그 식당은 온라인 예약을 받아요.', '那家餐厅接受网上预订。'],
  ['Your jacket is hanging behind the door.', '네 재킷은 문 뒤에 걸려 있어요.', '你的夹克挂在门后。'],
  ['The bus stop is across from the pharmacy.', '버스 정류장은 약국 맞은편에 있어요.', '公交站在药店对面。'],
  ['I need to renew my library card this week.', '이번 주에 도서관 카드를 갱신해야 해요.', '我这周需要续办图书馆卡。'],
  ['She gave me clear directions to her office.', '그녀가 사무실까지 가는 길을 자세히 알려줬어요.', '她清楚地告诉了我去她办公室的路线。'],
  ['The movie starts right after dinner.', '영화는 저녁 식사 직후에 시작해요.', '电影晚饭后马上开始。'],
  ['We should check the price before ordering.', '주문하기 전에 가격을 확인해야 해요.', '下单前我们应该确认价格。'],
  ['The gym is closed for cleaning this morning.', '헬스장은 오늘 아침 청소 때문에 문을 닫아요.', '健身房今天早上因清洁关闭。'],
  ['I made soup because my throat hurts.', '목이 아파서 수프를 만들었어요.', '我喉咙疼，所以做了汤。'],
]

const MEDIUM_SENTENCES = [
  ['I was going to apply for the workshop, but the registration deadline had already passed.', '워크숍에 신청하려고 했는데 등록 마감일이 이미 지났어요.', '我本来想报名参加研讨会，但报名截止日期已经过了。'],
  ['The apartment office asked residents to move their cars before the parking lot is repainted.', '아파트 관리실은 주차장 재도색 전에 주민들에게 차를 옮겨 달라고 했어요.', '公寓办公室要求住户在停车场重新划线前移走车辆。'],
  ['Could you check whether the invoice includes delivery, or whether we need to pay extra?', '송장에 배송비가 포함되어 있는지, 아니면 추가로 내야 하는지 확인해 줄 수 있나요?', '你能确认发票是否包含运费，还是我们需要额外支付吗？'],
  ['The manager postponed the training session because several employees were out sick.', '여러 직원이 병가라서 매니저가 교육 일정을 연기했어요.', '由于几名员工请病假，经理推迟了培训。'],
  ['I thought the address was correct, but the package was returned to the sender.', '주소가 맞다고 생각했는데 택배가 발송인에게 반송됐어요.', '我以为地址是正确的，但包裹被退回给寄件人了。'],
  ['The school sent a reminder that students must bring indoor shoes during the winter term.', '학교는 겨울 학기 동안 학생들이 실내화를 가져와야 한다는 알림을 보냈어요.', '学校发出提醒，学生冬季学期必须带室内鞋。'],
  ['If the repair company cannot come today, we may need to book a hotel for one night.', '수리 업체가 오늘 올 수 없다면 하룻밤 호텔을 예약해야 할 수도 있어요.', '如果维修公司今天来不了，我们可能需要订一晚酒店。'],
  ['The website would not accept my payment until I updated my billing address.', '청구 주소를 수정하기 전까지 웹사이트에서 결제가 되지 않았어요.', '在我更新账单地址之前，网站不接受付款。'],
  ['She joined the volunteer team so she could meet people and practice English at the same time.', '그녀는 사람들도 만나고 영어도 연습하려고 봉사팀에 들어갔어요.', '她加入志愿团队，是为了认识人并同时练习英语。'],
  ['The notice says visitors must sign in at reception before going upstairs.', '공지에는 방문객이 위층으로 올라가기 전에 접수처에서 등록해야 한다고 되어 있어요.', '通知说访客上楼前必须在前台登记。'],
  ['We compared three moving companies before choosing the one with insurance included.', '우리는 보험이 포함된 업체를 고르기 전에 이사 업체 세 곳을 비교했어요.', '我们比较了三家搬家公司后，选择了包含保险的一家。'],
  ['The clinic can see you tomorrow morning if you confirm the appointment by five today.', '오늘 5시까지 예약을 확인하면 병원에서 내일 아침 진료를 받을 수 있어요.', '如果你今天五点前确认预约，诊所明早可以接待你。'],
  ['The city added more buses during rush hour, but the route still takes longer than before.', '시에서 출퇴근 시간대 버스를 늘렸지만, 그 노선은 여전히 예전보다 시간이 더 걸려요.', '市政府在高峰时段增加了公交车，但这条路线仍比以前更耗时。'],
  ['I downloaded the form, but I still need someone to explain which documents are required.', '양식을 내려받았지만 어떤 서류가 필요한지 설명해 줄 사람이 아직 필요해요.', '我下载了表格，但仍需要有人解释需要哪些文件。'],
  ['The teacher recommended recording short answers instead of memorizing a long speech.', '선생님은 긴 발표문을 외우기보다 짧은 답변을 녹음해 보라고 권했어요.', '老师建议录制简短回答，而不是背一篇长演讲。'],
  ['The landlord agreed to replace the stove, but only after the technician confirms the problem.', '집주인은 기술자가 문제를 확인한 뒤에만 스토브를 교체해 주겠다고 했어요.', '房东同意更换炉灶，但要等技术人员确认问题后。'],
  ['My coworker switched shifts with me because I had a family appointment that afternoon.', '그날 오후 가족 일정이 있어서 동료가 저와 근무 시간을 바꿔줬어요.', '因为那天下午我有家庭预约，同事和我换了班。'],
  ['The museum offers free admission on Wednesdays, although special exhibitions still require tickets.', '박물관은 수요일에 무료 입장이지만 특별 전시는 여전히 티켓이 필요해요.', '博物馆星期三免费入场，但特别展览仍需购票。'],
  ['We should review the contract carefully before we agree to the monthly service fee.', '월 서비스 요금에 동의하기 전에 계약서를 꼼꼼히 검토해야 해요.', '在同意月服务费之前，我们应该仔细查看合同。'],
  ['The bank froze my card after it noticed several unusual transactions overseas.', '은행은 해외에서 이상 거래가 여러 건 감지되자 제 카드를 정지했어요.', '银行发现几笔海外异常交易后冻结了我的卡。'],
  ['The conference room is available after two, unless the previous meeting runs late.', '이전 회의가 늦어지지 않는다면 회의실은 2시 이후에 사용할 수 있어요.', '如果前一个会议不延迟，会议室两点后可以使用。'],
  ['I missed the delivery because the driver arrived while I was taking an online exam.', '온라인 시험을 보는 중에 기사님이 와서 배송을 놓쳤어요.', '送货员在我参加线上考试时到了，所以我错过了配送。'],
  ['The instructor said the homework is optional, but completing it will help with the final project.', '강사는 숙제가 선택 사항이지만 하면 최종 프로젝트에 도움이 된다고 했어요.', '老师说作业是自愿的，但完成它会有助于期末项目。'],
  ['The community centre is collecting winter coats for families who recently arrived in the city.', '커뮤니티 센터는 최근 이 도시에 온 가족들을 위해 겨울 코트를 모으고 있어요.', '社区中心正在为最近来到这座城市的家庭收集冬衣。'],
  ['The hotel offered a discount because our room was not ready when we arrived.', '우리가 도착했을 때 방이 준비되지 않아서 호텔이 할인을 제공했어요.', '因为我们到达时房间还没准备好，酒店提供了折扣。'],
  ['The online course includes weekly quizzes, but the final certificate requires a passing exam score.', '온라인 강좌에는 주간 퀴즈가 포함되어 있지만 최종 수료증을 받으려면 시험에 합격해야 해요.', '在线课程包括每周小测，但最终证书需要考试合格。'],
  ['She called customer service because the refund appeared in the wrong account.', '환불금이 잘못된 계좌에 들어와서 그녀는 고객센터에 전화했어요.', '因为退款到了错误账户，她打电话给客服。'],
  ['The hiking trail is open again, but visitors are asked to stay away from the riverbank.', '등산로는 다시 열렸지만 방문객들은 강둑에 가까이 가지 말아 달라는 요청을 받았어요.', '徒步路线重新开放了，但游客被要求远离河岸。'],
  ['We need to submit the application before noon if we want same-day processing.', '당일 처리를 원하면 정오 전에 신청서를 제출해야 해요.', '如果想当天处理，我们需要在中午前提交申请。'],
  ['The company will reimburse travel costs if employees keep their original receipts.', '직원들이 원본 영수증을 보관하면 회사가 출장비를 환급해 줄 거예요.', '如果员工保留原始收据，公司会报销差旅费。'],
  ['My neighbor offered to water the plants while I am visiting my parents.', '제가 부모님 댁에 가 있는 동안 이웃이 식물에 물을 주겠다고 했어요.', '我去看父母期间，邻居主动提出帮我浇植物。'],
  ['The lecture was interesting, but the speaker moved through the slides too quickly.', '강의는 흥미로웠지만 발표자가 슬라이드를 너무 빨리 넘겼어요.', '讲座很有趣，但演讲者翻幻灯片太快了。'],
  ['The repair estimate is higher than expected because one part has to be ordered from overseas.', '부품 하나를 해외에서 주문해야 해서 수리 견적이 예상보다 높아요.', '由于一个零件需要从海外订购，维修报价比预期高。'],
  ['The organizer asked everyone to arrive early so the event could start on time.', '행사가 제시간에 시작될 수 있도록 주최자가 모두에게 일찍 와 달라고 했어요.', '组织者要求大家早点到，以便活动准时开始。'],
  ['The software update fixed the login problem, but it also changed several menu names.', '소프트웨어 업데이트로 로그인 문제는 해결됐지만 메뉴 이름도 몇 개 바뀌었어요.', '软件更新修复了登录问题，但也更改了几个菜单名称。'],
  ['I need to choose between a cheaper plan with limits and a more expensive plan with support.', '제한이 있는 저렴한 요금제와 지원이 포함된 더 비싼 요금제 중에서 골라야 해요.', '我需要在有限制的便宜方案和包含支持的更贵方案之间选择。'],
]

const HARD_SENTENCES = [
  ['Although the notice sounded routine, residents actually had to remove everything from their balconies before the inspection.', '공지 내용은 평범해 보였지만, 실제로 주민들은 점검 전에 발코니의 모든 물건을 치워야 했어요.', '虽然通知听起来很普通，但住户实际上必须在检查前清空阳台上的所有物品。'],
  ['The committee postponed the decision because several members wanted to compare the long-term costs, not just the initial price.', '위원회는 초기 가격뿐 아니라 장기 비용도 비교하고 싶어 하는 위원들이 있어 결정을 미뤘어요.', '委员会推迟了决定，因为几名成员想比较长期成本，而不仅是初始价格。'],
  ['If the supplier cannot confirm the shipment by noon, the store may have to contact customers and offer refunds.', '공급업체가 정오까지 배송을 확인하지 못하면 매장은 고객에게 연락해 환불을 제안해야 할 수도 있어요.', '如果供应商中午前不能确认发货，商店可能不得不联系顾客并提供退款。'],
  ['The cheaper phone plan looks attractive until you realize that international calls are charged separately.', '그 휴대폰 요금제는 저렴해 보이지만 국제전화가 별도 요금이라는 걸 알면 매력이 줄어들어요.', '便宜的手机套餐看起来很吸引人，直到你发现国际电话要另收费。'],
  ['What confused me was not the schedule itself, but the fact that the pickup location changed twice in one day.', '헷갈렸던 건 일정 자체가 아니라 픽업 장소가 하루에 두 번 바뀌었다는 점이었어요.', '让我困惑的不是时间表本身，而是取货地点一天内改了两次。'],
  ['The speaker implied that online training would remain available, but only for employees who work outside the city.', '화자는 온라인 교육이 계속 제공되지만 시 외곽에서 근무하는 직원에게만 해당된다고 암시했어요.', '说话者暗示线上培训会继续提供，但只面向在市外工作的员工。'],
  ['Before accepting the invitation, I wanted to know whether the event included networking time or only a formal presentation.', '초대를 수락하기 전에 그 행사가 네트워킹 시간을 포함하는지 아니면 공식 발표만 있는지 알고 싶었어요.', '在接受邀请前，我想知道活动是否包含交流时间，还是只有正式演讲。'],
  ['The customer avoided blaming the receptionist and instead explained that the appointment had been entered under the wrong branch.', '고객은 접수원을 탓하지 않고 예약이 잘못된 지점으로 입력됐다고 설명했어요.', '顾客没有责怪前台，而是解释预约被录入到了错误的分店。'],
  ['Even after reading the instructions twice, I could not tell whether scanned copies were acceptable or originals were required.', '안내문을 두 번 읽고도 스캔본이 가능한지 원본이 필요한지 알 수 없었어요.', '即使读了两遍说明，我仍无法判断是否接受扫描件，还是必须提交原件。'],
  ['The policy is flexible in theory, but employees still have to attend monthly training sessions in person.', '그 정책은 이론적으로는 유연하지만 직원들은 여전히 월간 교육에 직접 참석해야 해요.', '这项政策理论上很灵活，但员工仍必须亲自参加每月培训。'],
  ['The city says the new bus lane will reduce delays, although drivers worry it may make parking even harder.', '시는 새 버스 전용 차로가 지연을 줄일 거라고 하지만 운전자들은 주차가 더 어려워질까 걱정해요.', '市政府表示新的公交专用道会减少延误，但司机担心停车会更难。'],
  ['The warranty covers repairs only after a three-week waiting period, which changes the value of the offer.', '그 보증은 3주 대기 기간이 지난 뒤에만 수리를 보장해서 제안의 가치가 달라져요.', '保修只有三周等待期后才覆盖维修，这改变了优惠的价值。'],
  ['The report did not say the project failed; it said the results were mixed and required further review.', '그 보고서는 프로젝트가 실패했다고 한 것이 아니라 결과가 엇갈려 추가 검토가 필요하다고 했어요.', '报告并没有说项目失败，而是说结果不一，需要进一步审查。'],
  ['Because the application asks for both income and household size, missing either detail could delay approval.', '신청서에는 소득과 가구원 수가 모두 필요하기 때문에 둘 중 하나라도 빠지면 승인이 지연될 수 있어요.', '由于申请需要收入和家庭人数，缺少任何一项都可能延误批准。'],
  ['The professor suggested narrowing the topic before collecting sources, otherwise the research question would be too broad.', '교수님은 자료를 모으기 전에 주제를 좁히라고 했어요. 그렇지 않으면 연구 질문이 너무 넓어질 수 있거든요.', '教授建议在收集资料前先缩小主题，否则研究问题会太宽泛。'],
  ['The interview panel cared less about perfect answers and more about how clearly applicants explained their reasoning.', '면접위원들은 완벽한 답보다 지원자가 자신의 이유를 얼마나 분명히 설명하는지를 더 중요하게 봤어요.', '面试小组更看重申请人是否清楚解释自己的理由，而不是答案是否完美。'],
  ['The apartment rule allows small pets, but tenants must still register them and pay a one-time cleaning fee.', '아파트 규정은 작은 반려동물을 허용하지만 세입자는 등록하고 1회 청소비를 내야 해요.', '公寓规定允许小型宠物，但租户仍需登记并支付一次性清洁费。'],
  ['The announcement mentioned construction noise first, but the main action was to close all windows by Monday morning.', '공지에서는 공사 소음을 먼저 언급했지만 핵심 조치는 월요일 아침까지 모든 창문을 닫는 것이었어요.', '通知先提到施工噪音，但主要要求是在周一早上前关好所有窗户。'],
  ['The candidate seemed qualified, yet the hiring team hesitated because his availability did not match the project timeline.', '그 지원자는 자격이 있어 보였지만 근무 가능 시간이 프로젝트 일정과 맞지 않아 채용팀이 망설였어요.', '候选人看起来合格，但招聘团队犹豫了，因为他的可工作时间不符合项目进度。'],
  ['The speaker contrasted two options: one saved money immediately, while the other reduced maintenance problems later.', '화자는 두 가지 선택지를 대비했어요. 하나는 당장 비용을 줄이고, 다른 하나는 나중의 유지보수 문제를 줄여 줬어요.', '说话者对比了两个选择：一个能立即省钱，另一个能减少以后的维护问题。'],
  ['The flight was not cancelled because of weather; it was delayed while the crew waited for a replacement aircraft.', '그 항공편은 날씨 때문에 취소된 것이 아니라 대체 항공기를 기다리느라 지연됐어요.', '航班不是因天气取消，而是在等待替代飞机时延误了。'],
  ['The survey found that many residents supported the park renovation, provided that mature trees were protected.', '설문조사에 따르면 많은 주민들이 오래된 나무를 보호한다는 조건으로 공원 개선을 지지했어요.', '调查发现，许多居民支持公园翻新，前提是保护成熟树木。'],
  ['The advice was to contact the office before sending payment, since the amount might change after the inspection.', '점검 후 금액이 달라질 수 있으니 결제하기 전에 사무실에 연락하라는 조언이었어요.', '建议是在付款前联系办公室，因为检查后金额可能会改变。'],
  ['The presentation compared remote work policies across three companies and showed why one policy was easier to enforce.', '그 발표는 세 회사의 원격근무 정책을 비교하고 왜 한 정책이 더 시행하기 쉬운지 보여줬어요.', '演示比较了三家公司的远程办公政策，并说明为什么其中一项更容易执行。'],
  ['The city opened the shelter overnight because temperatures were expected to drop below a safe level.', '기온이 안전 수준 아래로 떨어질 것으로 예상되어 시에서 밤새 쉼터를 열었어요.', '由于预计气温会降到安全水平以下，市政府夜间开放了避寒中心。'],
  ['The email sounded urgent, but it only asked employees to confirm their emergency contact information.', '그 이메일은 긴급해 보였지만 직원들에게 비상 연락처를 확인해 달라는 내용뿐이었어요.', '那封邮件看起来很紧急，但只是要求员工确认紧急联系人信息。'],
  ['The insurance agent recommended a higher deductible because it would lower the monthly premium significantly.', '보험 상담원은 월 보험료를 크게 낮출 수 있어서 더 높은 자기부담금을 추천했어요.', '保险代理建议选择更高的免赔额，因为这样可以大幅降低月保费。'],
  ['The speaker was not rejecting the idea completely; she wanted more evidence before making a recommendation.', '화자는 그 아이디어를 완전히 거절한 것이 아니라 추천하기 전에 더 많은 근거를 원했어요.', '说话者并不是完全拒绝这个想法，而是想在提出建议前看到更多证据。'],
  ['The company changed the deadline after realizing that several clients had not received the updated instructions.', '여러 고객이 수정된 안내를 받지 못했다는 사실을 알고 회사는 마감일을 변경했어요.', '公司发现几位客户没有收到更新后的说明后，更改了截止日期。'],
  ['The workshop is useful for beginners, but advanced learners may find the examples too predictable.', '그 워크숍은 초보자에게 유용하지만 고급 학습자에게는 예시가 너무 뻔하게 느껴질 수 있어요.', '该研讨会对初学者有用，但高级学习者可能会觉得例子过于可预测。'],
  ['The landlord agreed to reduce the rent temporarily, as long as the tenant provided proof of reduced income.', '세입자가 소득 감소 증빙을 제출한다는 조건으로 집주인은 임대료를 일시적으로 낮춰 주기로 했어요.', '只要租户提供收入减少证明，房东同意暂时降低租金。'],
  ['The research team excluded incomplete responses so the final results would not be misleading.', '연구팀은 최종 결과가 오해를 주지 않도록 불완전한 응답을 제외했어요.', '研究团队排除了不完整的回答，以免最终结果产生误导。'],
  ['The charity will accept furniture donations, but donors must arrange transportation themselves.', '그 자선단체는 가구 기부를 받지만 기부자가 직접 운송을 준비해야 해요.', '慈善机构接受家具捐赠，但捐赠者必须自行安排运输。'],
  ['The client approved the design only after the team simplified the homepage and removed unnecessary animations.', '팀이 홈페이지를 단순화하고 불필요한 애니메이션을 제거한 뒤에야 고객이 디자인을 승인했어요.', '团队简化主页并移除不必要动画后，客户才批准了设计。'],
  ['The counselor said the goal was not to speak faster, but to organize ideas before answering.', '상담사는 더 빨리 말하는 것이 목표가 아니라 답하기 전에 생각을 정리하는 것이 목표라고 했어요.', '顾问说目标不是说得更快，而是在回答前组织好想法。'],
  ['The proposal includes a short trial period, which lets users cancel before the full subscription begins.', '그 제안에는 짧은 체험 기간이 포함되어 있어 정식 구독이 시작되기 전에 취소할 수 있어요.', '该方案包含短期试用期，用户可以在正式订阅开始前取消。'],
]

const variants = [
  (item) => item,
  ([en, ko, zh]) => [
    `In the message, ${asClause(en)}`,
    `메시지에서는 ${ko}`,
    `信息中提到，${zh}`,
  ],
  ([en, ko, zh]) => [
    `The key point is that ${asClause(en)}`,
    `핵심은 ${ko}`,
    `重点是，${zh}`,
  ],
  ([en, ko, zh]) => [
    `Please remember that ${asClause(en)}`,
    `기억해야 할 점은 ${ko}`,
    `请记住，${zh}`,
  ],
  ([en, ko, zh]) => [
    `The speaker says that ${asClause(en)}`,
    `화자는 ${ko}`,
    `说话者说，${zh}`,
  ],
]

function asClause(sentence) {
  const text = sentence.trim()
  if (text.startsWith('I ')) return text
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

function buildSentences(difficulty, rows, targetCount = 220) {
  const items = []
  for (let i = 0; items.length < targetCount; i += 1) {
    const base = rows[i % rows.length]
    const variant = variants[Math.floor(i / rows.length) % variants.length]
    const [text, ko, zh] = variant(base)
    items.push({
      id: `${difficulty}-${String(i + 1).padStart(3, '0')}`,
      difficulty,
      text,
      ko,
      zh,
    })
  }
  return items
}

function interleaveByStep(items, step = 37) {
  if (!items.length) return []
  const used = new Set()
  const output = []
  let index = 0
  while (output.length < items.length) {
    if (!used.has(index)) {
      used.add(index)
      output.push(items[index])
    }
    index = (index + step) % items.length
    if (used.has(index)) {
      index = items.findIndex((_item, candidateIndex) => !used.has(candidateIndex))
      if (index === -1) break
    }
  }
  return output
}

export const SENTENCE_DIFFICULTIES = [
  { id: 'mixed', label: 'Mixed', description: 'All levels together' },
  { id: 'easy', label: 'Easy', description: 'Short and clear daily sentences' },
  { id: 'medium', label: 'Medium', description: 'Longer sentences with conditions' },
  { id: 'hard', label: 'Hard', description: 'Dense details, clauses, and reductions' },
]

export const SENTENCE_LISTENING_SENTENCES = interleaveByStep([
  ...buildSentences('easy', EASY_SENTENCES),
  ...buildSentences('medium', MEDIUM_SENTENCES),
  ...buildSentences('hard', HARD_SENTENCES),
])
