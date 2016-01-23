var mailer = require('./helpers/mailer');
var _locals = { 
	title : 'Счет к оплате',
	name : 'Vasiliy',
	invoice : { 
		payer : 'Vasiliy Testov',
		name : '+380679112686',
		sum : '235',
		date : Date.now()
	},
	services : [{ 
		name : 'Покупка подписки Premium',
		sum : '235'
	}],
	supportMail : 'smartpage.support@yandex.ru'
};
  
  

mailer.sendMailTemplate('smartpage.support@yandex.ru', 'murdalay@gmail.com', 'Test', 'payrequest-invoice.html', _locals);