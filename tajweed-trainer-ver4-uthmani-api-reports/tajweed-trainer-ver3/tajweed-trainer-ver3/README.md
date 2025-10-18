# تطبيق تدريبات التجويد | Tajweed Trainer App

## 📌 الوصف (Description)

**العربية**:  
مشروع تدريبي تفاعلي لتعليم وتقييم أحكام التجويد في القرآن الكريم.  
يوفر التطبيق أدوات عملية للمتعلمين تمكنهم من:  
- اختيار سور من القرآن الكريم بالرسم العثماني (مصحف المدينة).  
- استخدام الميكروفون لقراءة الآيات والحصول على تفريغ صوتي (Speech-to-Text) مع تقييم القراءة.  
- عرض الأخطاء وتصحيحها مع الاستماع للنطق الصحيح.  
- حل اختبارات في أحكام التجويد (النون الساكنة والتنوين، الميم الساكنة، المدود).  
- حفظ نتائج الاختبارات وعرض ملخص للتقدم (Progress Summary) باستخدام localStorage.

**English**:  
An interactive training project for **Qur’an Tajweed (pronunciation rules)**.  
The app allows learners to:  
- Select Surahs from the Qur’an (Uthmani script – Madinah Mushaf).  
- Use microphone input to read verses and get transcription (Speech-to-Text) with evaluation.  
- View and correct mistakes with audio playback for proper recitation.  
- Take quizzes on Tajweed rules (Noon Sakinah & Tanween, Meem Sakinah, Madd rules).  
- Save quiz results and view a progress summary (localStorage-based).

---

## ⚙️ المميزات (Features)

- 📖 عرض سور وآيات بالرسم العثماني.  
- 🎤 تفريغ القراءة وتقييمها باستخدام OpenAI API.  
- 📝 اختبارات تفاعلية (اختيار من متعدد).  
- 📊 حفظ النتائج وعرض ملخص التقدم.  
- ☁️ جاهز للنشر على Netlify.

---

## 🚀 خطوات النشر على Netlify (Deployment)

1. ارفع الملفات المفكوكة (index.html, styles.css, app.js, netlify.toml, functions/ …) إلى **GitHub**.  
2. اربط المستودع مع Netlify.  
3. من إعدادات Netlify:  
   - **Base directory**: اتركه فارغًا.  
   - **Build command**: اتركه فارغًا.  
   - **Publish directory**: `.`  
   - **Functions directory**: `functions`  
4. أضف متغير البيئة في Netlify:  
   - الاسم: `OPENAI_API_KEY`  
   - القيمة: مفتاح OpenAI الخاص بك.  
5. Trigger Deploy → **Deploy project without cache**.

---

## 🧪 استخدام التطبيق (Usage)

- اختر السورة والآية.  
- اضغط زر 🎤 "ابدأ التسجيل" واقرأ الآية.  
- بعد انتهاء التسجيل اضغط "تفريغ القراءة" ليتم عرض نص القراءة ومقارنتها بالنص الأصلي.  
- جرّب اختبارات التجويد:  
  - **النون الساكنة والتنوين**  
  - **الميم الساكنة**  
  - **أحكام المدود**  
- راجع ملخص تقدمك في القسم (٥).

---

## 👨‍💻 المطورون (Developers)

- OpenAI Whisper API for transcription.  
- Frontend: HTML, CSS, JavaScript.  
- Hosting: Netlify.  

---

## 📜 الترخيص (License)

- المشروع تعليمي وغير تجاري.  
- جميع الآيات بالرسم العثماني من مصحف المدينة المنورة.
