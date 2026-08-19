export default function desktopOnlyForPrivileged(req, res, next) {
  // تجاوز الفحص أثناء التطوير والاختبار المحلي
  if (process.env.NODE_ENV === "development" && process.env.ALLOW_MOBILE_DEV === "true") {
    return next();
  }

  const role = req.user?.role;

  // يطبق القيد فقط على الموظفين والمديرين
  if (!role || !["admin", "staff"].includes(role)) {
    return next();
  }

  const userAgent = String(req.headers["user-agent"] || "").toLowerCase();
  const chMobile = req.headers["sec-ch-ua-mobile"];

  // التحقق عبر Client Hints الحديثة إن وجدت
  if (chMobile === "?1") {
    return res.status(403).json({
      message: "الدخول إلى لوحة الموظف أو المدير متاح فقط من أجهزة الحاسوب المكتبية",
    });
  }

  // التحقق التقليدي عبر ترويسة User-Agent
  const isMobileOrTablet =
    /android|iphone|ipod|ipad|windows phone|mobile|opera mini|blackberry|tablet|silk|kindle/i.test(
      userAgent
    );

  if (isMobileOrTablet) {
    return res.status(403).json({
      message: "الدخول إلى لوحة الموظف أو المدير متاح فقط من أجهزة الحاسوب المكتبية",
    });
  }

  return next();
}