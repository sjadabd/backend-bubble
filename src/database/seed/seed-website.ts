import { resolve } from "path";
import { config } from "dotenv";
import { connectDatabase, disconnectDatabase } from "@database/connection";
import { WebsiteSection } from "@modules/website/website.model";
import { Product } from "@modules/products/product.model";
import { Category } from "@modules/categories/category.model";

config({ path: resolve(import.meta.dir, "../../../.env") });

const img = (file: string) => `/images/website/${file}`;

function yearRange() {
  const start = new Date();
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  end.setMonth(11, 31);
  end.setHours(23, 59, 59, 0);
  return { startAt: start, endAt: end };
}

async function seedWebsite() {
  await connectDatabase();

  const products = await Product.find({ deletedAt: null, status: "active" })
    .select("title slug gallery variants")
    .lean();
  const categories = await Category.find({ deletedAt: null })
    .select("title logo")
    .lean();

  const dish =
    products.find((p) => p.title.includes("جلي")) ?? products[0] ?? null;
  const range = yearRange();

  const sections = [
    // —— Homepage heroes (slider by sortOrder) ——
    {
      name: "Hero — نظافة المطبخ",
      page: "homepage",
      type: "hero",
      status: "active",
      sortOrder: 1,
      ...range,
      data: {
        title: "نظافة تلمع في كل زاوية",
        subtitle: "منتجات Bubble للعناية بالمنزل",
        description:
          "اكتشف منظفات Bubble المصمّمة للمطبخ والحمام والغسيل — قوة تنظيف بلمسة ناعمة على الأسطح.",
        backgroundType: "image",
        image: img("hero-dish.jpg"),
        mobileImage: img("hero-dish.jpg"),
        video: "",
        backgroundColor: "",
        overlay: 45,
        contentPosition: "right",
        textTheme: "light",
        buttons: [
          {
            label: "تسوق الآن",
            url: "/products",
            style: "primary",
          },
          {
            label: "منظفات المطبخ",
            url: dish ? `/products/${dish._id.toString()}` : "/products",
            style: "secondary",
          },
        ],
      },
    },
    {
      name: "Hero — غسيل ملابس",
      page: "homepage",
      type: "hero",
      status: "active",
      sortOrder: 2,
      ...range,
      data: {
        title: "بياض يدوم ونعومة تُحسّ",
        subtitle: "عناية بالغسيل كل يوم",
        description:
          "مساحيق وسوائل غسيل Bubble تمنحك رائحة منعشة ونتائج موثوقة لكل غسلة.",
        backgroundType: "image",
        image: img("hero-laundry.jpg"),
        mobileImage: img("hero-laundry.jpg"),
        video: "",
        backgroundColor: "",
        overlay: 40,
        contentPosition: "center",
        textTheme: "light",
        buttons: [
          { label: "اكتشف المنتجات", url: "/products", style: "primary" },
        ],
      },
    },
    {
      name: "Hero — منزل متألق",
      page: "homepage",
      type: "hero",
      status: "active",
      sortOrder: 3,
      ...range,
      data: {
        title: "بيت أنظف… بخطوات أبسط",
        subtitle: "حلول تنظيف يومية",
        description:
          "من الكلور إلى المساحيق المتعددة الاستخدام — كل ما تحتاجه لنظافة موثوقة تحت سقف واحد.",
        backgroundType: "image",
        image: img("hero-home.jpg"),
        mobileImage: img("hero-home.jpg"),
        video: "",
        backgroundColor: "",
        overlay: 42,
        contentPosition: "left",
        textTheme: "light",
        buttons: [
          { label: "تصفّح الأقسام", url: "/categories", style: "primary" },
          { label: "تواصل معنا", url: "/contact", style: "secondary" },
        ],
      },
    },

    // —— Homepage banner ——
    {
      name: "بانر عرض التوصيل",
      page: "homepage",
      type: "banner",
      status: "active",
      sortOrder: 10,
      ...range,
      data: {
        title: "توصيل سريع لطلبك",
        subtitle: "على جميع منتجات التنظيف",
        description: "اطلب اليوم واستلم طلبك بأسرع وقت داخل المدينة.",
        image: img("banner-promo.jpg"),
        mobileImage: img("banner-promo.jpg"),
        linkUrl: "/products",
        linkLabel: "ابدأ التسوق",
        theme: "blue",
      },
    },

    // —— Homepage announcement ——
    {
      name: "شريط إعلان علوي",
      page: "homepage",
      type: "announcement",
      status: "active",
      sortOrder: 0,
      ...range,
      data: {
        text: "شحن مجاني للطلبات فوق 50,000 د.ع — عرض لفترة محدودة",
        linkUrl: "/products",
        linkLabel: "تسوق الآن",
        tone: "info",
        dismissible: true,
      },
    },

    // —— Homepage features ——
    {
      name: "مميزات المتجر",
      page: "homepage",
      type: "feature",
      status: "active",
      sortOrder: 20,
      ...range,
      data: {
        title: "لماذا Bubble؟",
        subtitle: "ثقة يومية في منتجات التنظيف",
        items: [
          {
            title: "جودة موثوقة",
            description: "تركيبات فعّالة تناسب الاستخدام المنزلي اليومي.",
            icon: "shield",
          },
          {
            title: "أسعار واضحة",
            description: "عروض وباقات توفير بدون تعقيد.",
            icon: "tag",
          },
          {
            title: "توصيل مرتّب",
            description: "تتبع طلبك واستلام سلس إلى باب المنزل.",
            icon: "truck",
          },
          {
            title: "دعم سريع",
            description: "فريق خدمة عملاء جاهز لمساعدتك.",
            icon: "headset",
          },
        ],
      },
    },

    // —— Homepage gallery (product highlights) ——
    {
      name: "معرض منتجات مميزة",
      page: "homepage",
      type: "gallery",
      status: "active",
      sortOrder: 30,
      ...range,
      data: {
        title: "اختيارات العملاء",
        subtitle: "منتجات رائجة من كتالوج Bubble",
        layout: "grid",
        items: products.slice(0, 6).map((product, index) => ({
          productId: product._id.toString(),
          title: product.title,
          image: product.gallery?.[0]?.url ?? img("hero-home.jpg"),
          url: `/products/${product._id.toString()}`,
          sortOrder: index + 1,
          price: product.variants?.[0]?.price ?? null,
        })),
        categories: categories.map((category) => ({
          categoryId: category._id.toString(),
          title: category.title,
          image: category.logo ?? null,
          url: `/categories/${category._id.toString()}`,
        })),
      },
    },

    // —— Header ——
    {
      name: "قائمة الهيدر",
      page: "header",
      type: "banner",
      status: "active",
      sortOrder: 1,
      startAt: null,
      endAt: null,
      data: {
        logoUrl: "/images/logo.png",
        logoAlt: "Bubble",
        links: [
          { label: "الرئيسية", url: "/" },
          { label: "المنتجات", url: "/products" },
          { label: "الأقسام", url: "/categories" },
          { label: "العروض", url: "/promotions" },
          { label: "من نحن", url: "/about" },
          { label: "تواصل", url: "/contact" },
        ],
        cta: { label: "تسوق الآن", url: "/products" },
        showSearch: true,
        showCart: true,
      },
    },

    // —— Footer ——
    {
      name: "فوتر الموقع",
      page: "footer",
      type: "feature",
      status: "active",
      sortOrder: 1,
      startAt: null,
      endAt: null,
      data: {
        brandName: "Bubble",
        tagline: "منتجات تنظيف تثق بها كل يوم",
        logoUrl: "/images/logo.png",
        columns: [
          {
            title: "تسوق",
            links: [
              { label: "كل المنتجات", url: "/products" },
              { label: "الأقسام", url: "/categories" },
              { label: "العروض", url: "/promotions" },
            ],
          },
          {
            title: "المساعدة",
            links: [
              { label: "تواصل معنا", url: "/contact" },
              { label: "من نحن", url: "/about" },
              { label: "سياسة الاسترجاع", url: "/about#returns" },
            ],
          },
          {
            title: "تواصل",
            links: [
              { label: "0780 000 0000", url: "tel:+9647800000000" },
              { label: "hello@bubble.local", url: "mailto:hello@bubble.local" },
              { label: "بغداد، العراق", url: "/contact" },
            ],
          },
        ],
        social: [
          { network: "instagram", url: "https://instagram.com" },
          { network: "facebook", url: "https://facebook.com" },
          { network: "whatsapp", url: "https://wa.me/9647800000000" },
        ],
        copyright: `© ${new Date().getFullYear()} Bubble. جميع الحقوق محفوظة.`,
      },
    },

    // —— About ——
    {
      name: "Hero — من نحن",
      page: "about",
      type: "hero",
      status: "active",
      sortOrder: 1,
      ...range,
      data: {
        title: "قصة Bubble",
        subtitle: "تنظيف أوضح… حياة أسهل",
        description:
          "نؤمن أن النظافة تبدأ بمنتج موثوق وسهل الاستخدام. نقدّم كتالوج منظفات منزلية بجودة ثابتة وخدمة قريبة من عملائنا.",
        backgroundType: "image",
        image: img("about-story.jpg"),
        mobileImage: img("about-story.jpg"),
        video: "",
        backgroundColor: "",
        overlay: 50,
        contentPosition: "right",
        textTheme: "light",
        buttons: [
          { label: "تصفّح المنتجات", url: "/products", style: "primary" },
        ],
      },
    },
    {
      name: "قيم العلامة",
      page: "about",
      type: "feature",
      status: "active",
      sortOrder: 2,
      ...range,
      data: {
        title: "قيمنا",
        items: [
          {
            title: "الجودة أولاً",
            description: "نختار منتجات تثبت كفاءتها في الاستخدام اليومي.",
          },
          {
            title: "الوضوح",
            description: "أسعار ووصف واضح بدون مفاجآت عند الاستلام.",
          },
          {
            title: "القرب من العميل",
            description: "دعم سريع ومتابعة للطلبات حتى باب المنزل.",
          },
        ],
        storyImage: img("about-story.jpg"),
        storyBody:
          "Bubble متجر متخصص بمنتجات التنظيف والعناية المنزلية. نبني تجربة تسوق عربية بسيطة، مع تركيز على الثقة والتوصيل الموثوق.",
      },
    },

    // —— Contact ——
    {
      name: "Hero — تواصل",
      page: "contact",
      type: "hero",
      status: "active",
      sortOrder: 1,
      ...range,
      data: {
        title: "نحن هنا لمساعدتك",
        subtitle: "تواصل مع فريق Bubble",
        description:
          "للاستفسار عن الطلبات أو المنتجات أو العروض — راسلنا وسنعود إليك في أقرب وقت.",
        backgroundType: "color",
        image: "",
        mobileImage: "",
        video: "",
        backgroundColor: "#003c9c",
        overlay: 0,
        contentPosition: "center",
        textTheme: "light",
        buttons: [
          {
            label: "واتساب",
            url: "https://wa.me/9647800000000",
            style: "primary",
          },
        ],
      },
    },
    {
      name: "بيانات التواصل",
      page: "contact",
      type: "feature",
      status: "active",
      sortOrder: 2,
      ...range,
      data: {
        title: "معلومات التواصل",
        subtitle: "فريق Bubble جاهز لمساعدتك",
        description:
          "للاستفسار عن الطلبات أو المنتجات أو العروض — راسلنا وسنعود إليك في أقرب وقت.",
        phone: "+964 780 000 0000",
        email: "hello@bubble.local",
        whatsapp: "+9647800000000",
        address: "بغداد، العراق",
        hours: "السبت – الخميس: 9 صباحاً – 9 مساءً",
        mapLat: 33.3152,
        mapLng: 44.3661,
        mapZoom: 14,
        formFields: ["name", "phone", "email", "message"],
        formSubmitLabel: "إرسال عبر واتساب",
      },
    },
  ];

  const deleted = await WebsiteSection.deleteMany({});
  console.log(`تم حذف الأقسام السابقة: ${deleted.deletedCount}`);

  await WebsiteSection.insertMany(sections);
  console.log(`تم إنشاء ${sections.length} قسماً للموقع:`);
  for (const section of sections) {
    console.log(
      `  • [${section.page}/${section.type}] ${section.name} (ترتيب ${section.sortOrder})`,
    );
  }
  console.log("الصور في: frontend/public/images/website و admin/public/images/website");

  await disconnectDatabase();
}

seedWebsite().catch(async (error) => {
  console.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
