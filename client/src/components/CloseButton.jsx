import { useNavigate } from "react-router-dom";

export default function CloseButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/")}
      style={{
        position: "absolute",
        top: "15px",
        left: "15px",
        background: "transparent",
        border: "none",
        fontSize: "22px",
        cursor: "pointer"
      }}
      aria-label="إغلاق"
    >
      ❌
    </button>
  );
}
