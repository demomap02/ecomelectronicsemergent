from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid, random, logging, bcrypt, jwt

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

app = FastAPI(title="VoltMart API", version="1.0.0")
api = APIRouter(prefix="/api")
logger = logging.getLogger("voltmart")
logging.basicConfig(level=logging.INFO)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def public_user(u: dict) -> dict:
    return {"id": u["id"], "name": u.get("name"), "email": u.get("email"),
            "phone": u.get("phone"), "role": u.get("role", "customer"),
            "created_at": u.get("created_at")}

async def get_current_user(request: Request) -> dict:
    token = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_partner(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("delivery_partner", "admin"):
        raise HTTPException(status_code=403, detail="Delivery partner access required")
    return user

# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "customer"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class OtpRequestIn(BaseModel):
    phone: str

class OtpVerifyIn(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class ProductIn(BaseModel):
    title: str
    brand: str
    category: str
    price: float
    mrp: float
    stock: int = 50
    description: str = ""
    images: List[str] = []
    specs: dict = {}
    badges: List[str] = []
    featured: bool = False
    deal: bool = False
    rating: float = 4.3
    rating_count: int = 120

class CategoryIn(BaseModel):
    name: str
    slug: str
    image: str = ""
    icon: str = "Cpu"

class CartItemIn(BaseModel):
    product_id: str
    qty: int = 1

class CouponIn(BaseModel):
    code: str
    percent: int
    max_discount: float = 100000
    min_order: float = 0
    active: bool = True

class CheckoutIn(BaseModel):
    address: dict
    payment_method: str = "mock"
    coupon: Optional[str] = None

class ConfigIn(BaseModel):
    active_layout: Optional[str] = None
    active_theme: Optional[str] = None
    banners: Optional[List[dict]] = None

class RoleIn(BaseModel):
    role: str

class StatusIn(BaseModel):
    status: str

class AssignIn(BaseModel):
    delivery_partner_id: str

# ---------- Theme tokens & layouts (single source, Flutter-consumable) ----------
THEMES = {
    "hyper_retail": {"id":"hyper_retail","name":"Hyper Retail","vibe":"High density flash sales","colors":{"primary":"#FACC15","secondary":"#1D4ED8","background":"#F8FAFC","surface":"#FFFFFF","text":"#0F172A","muted":"#64748B","border":"#E2E8F0","accent":"#EF4444"},"typography":{"heading":"'Cabinet Grotesk',sans-serif","body":"'IBM Plex Sans',sans-serif"},"radius":"6px","dark":False},
    "cyber_neon": {"id":"cyber_neon","name":"Cyber Neon","vibe":"Dark gamer futuristic","colors":{"primary":"#22D3EE","secondary":"#F472B6","background":"#09090B","surface":"#18181B","text":"#F8FAFC","muted":"#A1A1AA","border":"#27272A","accent":"#A855F7"},"typography":{"heading":"'Unbounded',sans-serif","body":"'JetBrains Mono',monospace"},"radius":"0px","dark":True},
    "minimalist_swiss": {"id":"minimalist_swiss","name":"Stark Swiss","vibe":"Extreme clarity","colors":{"primary":"#000000","secondary":"#64748B","background":"#FFFFFF","surface":"#F1F5F9","text":"#000000","muted":"#64748B","border":"#111111","accent":"#DC2626"},"typography":{"heading":"'General Sans',sans-serif","body":"'General Sans',sans-serif"},"radius":"0px","dark":False},
    "soft_pastel": {"id":"soft_pastel","name":"Soft Pastel","vibe":"Tactile Gen-Z","colors":{"primary":"#FDBA74","secondary":"#A7F3D0","background":"#FFFAEB","surface":"#FFFFFF","text":"#1F2937","muted":"#9CA3AF","border":"#FDE68A","accent":"#FB7185"},"typography":{"heading":"'Outfit',sans-serif","body":"'Figtree',sans-serif"},"radius":"24px","dark":False},
    "luxury_midnight": {"id":"luxury_midnight","name":"Luxury Midnight","vibe":"Premium cinematic","colors":{"primary":"#FBBF24","secondary":"#064E3B","background":"#020617","surface":"#0F172A","text":"#F8FAFC","muted":"#94A3B8","border":"#1E293B","accent":"#38BDF8"},"typography":{"heading":"'Playfair Display',serif","body":"'Manrope',sans-serif"},"radius":"10px","dark":True},
}
LAYOUTS = [
    {"id":"layout_mega_mall","name":"The Mega Mall","desc":"Hero carousel, category circles, flash rails, dense grid."},
    {"id":"layout_bento","name":"The Bento Showcase","desc":"Asymmetric editorial bento grid."},
    {"id":"layout_flash_frenzy","name":"The Flash Sale Frenzy","desc":"Countdown-driven urgent rails."},
    {"id":"layout_category_pillar","name":"The Category Pillar","desc":"Left category sidebar + endless feed."},
    {"id":"layout_immersive","name":"The Immersive Hero","desc":"Parallax flagship hero + glass grid."},
]

# ---------- Seed data ----------
IMG = {
 "laptops":["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "smartphones":["https://images.unsplash.com/photo-1634403665481-74948d815f03?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1580910051074-3eb694886505?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "audio":["https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1590658268037-6bf12165a8df?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1606741965326-cb990ae01bb2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "cameras":["https://images.unsplash.com/photo-1536632087471-3cf3f2986328?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1582994254571-52c62d96ebab?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1616088886430-ccd86fef0713?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1516035069371-29a1b244cc32?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "wearables":["https://images.unsplash.com/photo-1579586337278-3befd40fd17a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1546868871-7041f2a55e12?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1660844817855-3ecc7ef21f12?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "gaming":["https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1509198397868-475647b2a1e5?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1600861194942-f883de0dfe96?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "tv":["https://images.unsplash.com/photo-1461151304267-38535e780c79?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1646861039459-fd9e3aabf3fb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
 "speakers":["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1589003077984-894e133dabab?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1582978571763-2d039e56f0c3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800","https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"],
}
ASW_IMG = [
 "https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/zjcooafr_WhatsApp%20Image%202026-08-04%20at%2011.13.15%20AM.jpeg",
 "https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/9ol8j0tf_WhatsApp%20Image%202026-08-04%20at%2011.13.15%20AM%20%281%29.jpeg",
 "https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/pchopp6t_WhatsApp%20Image%202026-08-04%20at%2011.13.15%20AM%20%282%29.jpeg",
 "https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/3pnsoha9_WhatsApp%20Image%202026-08-04%20at%2011.13.14%20AM.jpeg",
 "https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/sbq6vf3w_WhatsApp%20Image%202026-08-04%20at%2011.13.14%20AM%20%281%29.jpeg",
]
ASW_PRODUCTS = [
 {"title":"ASW AS-931 Telescopic Zoom Flashlight","price":1299,"mrp":1999,"stock":60,"pack":"60 PC/CNT","img":ASW_IMG[0],"rating":4.6,"rc":812,"desc":"ASW AS-931 heavy-duty aluminium flashlight with 80W DSM LED, telescopic zoom and Type-C fast charging. 120 minutes runtime on a single charge — built for camping, security and emergency use."},
 {"title":"ASW AS-603-5 COB Work Light Flashlight","price":899,"mrp":1499,"stock":120,"pack":"120 PC/CNT","img":ASW_IMG[1],"rating":4.5,"rc":1043,"desc":"ASW AS-603-5 dual-mode torch with side COB panel and top spotlight. 80W DSM output, Type-C rechargeable, 120 min runtime and a handy pocket clip for hands-free work."},
 {"title":"ASW AS-982 Long-Range Tactical Flashlight","price":1599,"mrp":2499,"stock":48,"pack":"48 PC/CNT","img":ASW_IMG[2],"rating":4.7,"rc":534,"desc":"ASW AS-982 long-body tactical flashlight engineered for maximum throw. 80W DSM LED, telescopic zoom, Type-C charging and rugged anodised aluminium housing."},
 {"title":"ASW AS-627 Zoomable Pocket Flashlight","price":1099,"mrp":1799,"stock":120,"pack":"120 PC/CNT","img":ASW_IMG[3],"rating":4.4,"rc":689,"desc":"ASW AS-627 compact zoomable flashlight with orange power switch, 80W DSM output and Type-C charging. 120 minute runtime in a grippy knurled body."},
 {"title":"ASW AS-513 Mini COB Rechargeable Torch","price":499,"mrp":899,"stock":240,"pack":"240 PC/CNT","img":ASW_IMG[4],"rating":4.3,"rc":1580,"desc":"ASW AS-513 pocket-size flashlight with COB side light, magnetic clip and Type-C charging. Big 80W DSM performance in a mini everyday-carry torch."},
 {"title":"ASW AS-9509 COB Tube Flashlight","price":549,"mrp":999,"stock":240,"pack":"240 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/htnyz49d_WhatsApp%20Image%202026-08-04%20at%2011.13.19%20AM.jpeg","rating":4.5,"rc":1290,"video":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/x8ff8w2k_WhatsApp%20Video%202026-08-04%20at%2011.13.19%20AM.mp4","desc":"ASW AS-9509 transparent-body COB tube flashlight. 80W DSM output, Type-C fast charging and 120 min runtime. Watch it in action in the product video."},
 {"title":"ASW AS-608 Carabiner Work Light","price":799,"mrp":1399,"stock":120,"pack":"120 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/da3xbudl_WhatsApp%20Image%202026-08-04%20at%2011.13.20%20AM%20%281%29.jpeg","rating":4.6,"rc":742,"desc":"ASW AS-608 flashlight with integrated carabiner clip and full-length side COB panel. Telescopic zoom, 80W DSM and Type-C charging for camping and outdoor work."},
 {"title":"ASW AS-521 Compact Zoom Flashlight","price":649,"mrp":1199,"stock":240,"pack":"240 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/eec7p47v_WhatsApp%20Image%202026-08-04%20at%2011.13.20%20AM%20%282%29.jpeg","rating":4.4,"rc":905,"desc":"ASW AS-521 gunmetal compact flashlight with telescopic zoom, 80W DSM LED and Type-C charging. Pocketable, rugged and rechargeable."},
 {"title":"ASW AS-987 100W Tactical Rescue Flashlight","price":1899,"mrp":2999,"stock":120,"pack":"120 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/tdm3qdk6_WhatsApp%20Image%202026-08-04%20at%2011.13.20%20AM.jpeg","rating":4.8,"rc":611,"power":"100W + 30W COB","desc":"ASW AS-987 high-power rescue flashlight with 100W spotlight, 30W side COB, glass-breaker hammer, belt cutter and Type-C charging. Built for emergencies and tactical use."},
 {"title":"ASW AS-981 Long-Range Zoom Flashlight","price":1399,"mrp":2199,"stock":60,"pack":"60 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/w8oe94ch_WhatsApp%20Image%202026-08-04%20at%2011.13.21%20AM%20%281%29.jpeg","rating":4.7,"rc":488,"desc":"ASW AS-981 heavy black flashlight with long-throw telescopic zoom, 80W DSM LED and Type-C charging. 120 minute runtime and a rugged textured grip."},
 {"title":"ASW AS-036C RGB Multi-Colour Flashlight","price":999,"mrp":1699,"stock":120,"pack":"120 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/8lt6kbnk_WhatsApp%20Image%202026-08-04%20at%2011.13.21%20AM%20%282%29.jpeg","rating":4.5,"rc":803,"desc":"ASW AS-036C flashlight with side COB work light and RGB accent lighting on the base. 80W DSM, telescopic zoom and Type-C charging — practical and eye-catching."},
 {"title":"ASW AS-511 Mini COB Zoom Torch","price":449,"mrp":799,"stock":240,"pack":"240 PC/CNT","img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/tdbimlf2_WhatsApp%20Image%202026-08-04%20at%2011.13.21%20AM.jpeg","rating":4.3,"rc":1712,"desc":"ASW AS-511 mini flashlight with COB side light and telescopic zoom. 80W DSM output, Type-C charging and a tough carry case — everyday carry essential."},
]
ASW_COMB = {"title":"ASW AS-C603 Electric Spray Retractable Air Cushion Comb","price":899,"mrp":1599,"stock":150,
 "imgs":["https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/zqidcgcy_WhatsApp%20Image%202026-08-04%20at%2011.13.22%20AM.jpeg","https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/ebdu5yn8_WhatsApp%20Image%202026-08-04%20at%2011.13.32%20AM.jpeg"],
 "desc":"ASW AS-C603 Electric Spray Retractable Air Cushion Comb. Rechargeable USB-C massage comb that mists water or serum while you brush — detangles gently, massages the scalp and retracts for travel. Available in beige, purple and pink.",
 "video":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/53ip5hli_WhatsApp%20Video%202026-08-04%20at%2011.13.32%20AM.mp4"}
ASW_KITCHEN = {"title":"ASW AS-JC11 Rechargeable Portable Blender","price":1799,"mrp":2999,"stock":90,
 "img":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/2xpqd0mq_WhatsApp%20Image%202026-08-04%20at%2011.13.36%20AM.jpeg",
 "video":"https://customer-assets-39nsmqrw.emergentagent.net/job_api-first-storefront/artifacts/xdp9gftm_WhatsApp%20Video%202026-08-04%20at%2011.13.35%20AM.mp4",
 "desc":"ASW AS-JC11 rechargeable portable blender with a high-aesthetic dual-colour design. Quick juicing on the go, cordless USB-charged motor and a durable glass jar — enjoy fresh juice and smoothies every day. Available in classic black and white."}
CATS = [
 {"slug":"laptops","name":"Laptops","icon":"Laptop","image":IMG["laptops"][0]},
 {"slug":"smartphones","name":"Smartphones","icon":"Smartphone","image":IMG["smartphones"][1]},
 {"slug":"audio","name":"Audio","icon":"Headphones","image":IMG["audio"][0]},
 {"slug":"cameras","name":"Cameras","icon":"Camera","image":IMG["cameras"][0]},
 {"slug":"wearables","name":"Wearables","icon":"Watch","image":IMG["wearables"][1]},
 {"slug":"gaming","name":"Gaming","icon":"Gamepad2","image":IMG["gaming"][2]},
 {"slug":"tv","name":"TV & Display","icon":"Tv","image":IMG["tv"][1]},
 {"slug":"speakers","name":"Speakers","icon":"Speaker","image":IMG["speakers"][0]},
]
BRANDS = {"laptops":["Apple","Dell","HP","Lenovo","Asus"],"smartphones":["Apple","Samsung","OnePlus","Google","Xiaomi"],
 "audio":["Sony","Bose","Apple","JBL","Sennheiser"],"cameras":["Canon","Sony","Nikon","Fujifilm"],
 "wearables":["Apple","Samsung","Garmin","Fitbit"],"gaming":["Sony","Microsoft","Nintendo","Razer"],
 "tv":["Samsung","LG","Sony","TCL"],"speakers":["JBL","Bose","Marshall","Sonos"]}
MODELS = {"laptops":["Pro 14 M3","XPS 15","Spectre x360","ThinkPad X1","ZenBook 14"],
 "smartphones":["Pro Max 256GB","Galaxy S24 Ultra","12 Pro 5G","Pixel 8 Pro","14 Ultra"],
 "audio":["WH-1000XM5","QuietComfort Ultra","AirPods Pro 2","Live 660NC","Momentum 4"],
 "cameras":["EOS R6 II","Alpha A7 IV","Z6 III","X-T5"],
 "wearables":["Watch Ultra 2","Galaxy Watch 6","Fenix 7","Sense 2"],
 "gaming":["PS5 Slim","Xbox Series X","Switch OLED","Kishi V2"],
 "tv":["Neo QLED 55\"","OLED C4 65\"","Bravia XR 55\"","QLED 50\""],
 "speakers":["Charge 5","SoundLink Flex","Emberton II","Era 100"]}

async def seed():
    # categories
    if await db.categories.count_documents({}) == 0:
        for c in CATS:
            await db.categories.insert_one({"id":new_id(),**c,"created_at":now_iso()})
    # products
    if await db.products.count_documents({}) == 0:
        products=[]
        for cat in CATS:
            slug=cat["slug"]
            for i in range(7):
                brand=random.choice(BRANDS[slug]); model=random.choice(MODELS[slug])
                base=random.choice([2999,4999,7999,12999,19999,29999,49999,74999,129999])
                disc=random.choice([5,10,15,20,25,30,40,50])
                price=round(base*(1-disc/100))
                imgs=IMG[slug]
                img=imgs[i % len(imgs)]
                badges=[]
                if disc>=30: badges.append(f"{disc}% OFF")
                if i%4==0: badges.append("BESTSELLER")
                stock=random.choice([2,3,5,15,40,80,120])
                if stock<=3: badges.append(f"ONLY {stock} LEFT")
                products.append({
                    "id":new_id(),"title":f"{brand} {model}","brand":brand,"category":slug,
                    "price":float(price),"mrp":float(base),"discount_pct":disc,
                    "stock":stock,"images":[img,imgs[(i+1)%len(imgs)]],
                    "description":f"Experience the next generation {cat['name'][:-1] if cat['name'].endswith('s') else cat['name']} with the {brand} {model}. Premium build, flagship performance and industry-leading features.",
                    "specs":{"Warranty":"1 Year","In the box":f"{brand} {model}, Charger, Manual","Color":random.choice(['Black','Silver','Midnight','Blue'])},
                    "badges":badges,"featured":i<2,"deal":disc>=25,
                    "rating":round(random.uniform(3.8,4.9),1),"rating_count":random.randint(45,5400),
                    "created_at":now_iso()})
        await db.products.insert_many(products)
    # coupons
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([
            {"id":new_id(),"code":"VOLT10","percent":10,"max_discount":2000,"min_order":999,"active":True,"created_at":now_iso()},
            {"id":new_id(),"code":"MEGA25","percent":25,"max_discount":5000,"min_order":4999,"active":True,"created_at":now_iso()},
        ])
    # settings
    if await db.settings.find_one({"id":"store"}) is None:
        await db.settings.insert_one({"id":"store","active_layout":"layout_mega_mall","active_theme":"hyper_retail",
            "banners":[
                {"id":new_id(),"title":"Mega Electronics Sale","subtitle":"Up to 50% off on flagship gadgets","image":"https://images.unsplash.com/photo-1498049794561-7780e7231661?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400","cta":"Shop Deals","link":"/products?deal=1"},
                {"id":new_id(),"title":"Next-Gen Laptops","subtitle":"Power that moves with you","image":"https://images.unsplash.com/photo-1595303526913-c7037797ebe7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400","cta":"Explore Laptops","link":"/products?category=laptops"},
                {"id":new_id(),"title":"Sound Redefined","subtitle":"Premium audio, immersive experience","image":"https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400","cta":"Shop Audio","link":"/products?category=audio"},
            ]})
    # ASW flashlights (real uploaded products) — always ensured
    if await db.categories.find_one({"slug":"flashlights"}) is None:
        await db.categories.insert_one({"id":new_id(),"slug":"flashlights","name":"Flashlights","icon":"Flashlight","image":ASW_IMG[0],"created_at":now_iso()})
    for fp in ASW_PRODUCTS:
        if await db.products.find_one({"title":fp["title"]}) is None:
            disc=round((1-fp["price"]/fp["mrp"])*100)
            doc={"id":new_id(),"title":fp["title"],"category":"flashlights","brand":"ASW",
                "price":float(fp["price"]),"mrp":float(fp["mrp"]),"discount_pct":disc,"stock":fp["stock"],
                "images":[fp["img"]],"description":fp["desc"],
                "specs":{"Power":fp.get("power","80W DSM"),"Operating Time":"120 mins","Charging":"Type-C","Zoom":"Telescopic","Pack Size":fp["pack"],"Brand":"ASW"},
                "badges":([f"{disc}% OFF"] if disc>=25 else [])+["BESTSELLER"],"featured":True,"deal":disc>=25,
                "rating":fp["rating"],"rating_count":fp["rc"],"created_at":now_iso()}
            if fp.get("video"): doc["video"]=fp["video"]
            await db.products.insert_one(doc)
    # ASW grooming — air cushion comb
    if await db.categories.find_one({"slug":"grooming"}) is None:
        await db.categories.insert_one({"id":new_id(),"slug":"grooming","name":"Personal Care","icon":"Sparkles","image":ASW_COMB["imgs"][0],"created_at":now_iso()})
    if await db.products.find_one({"title":ASW_COMB["title"]}) is None:
        d=round((1-ASW_COMB["price"]/ASW_COMB["mrp"])*100)
        await db.products.insert_one({"id":new_id(),"title":ASW_COMB["title"],"category":"grooming","brand":"ASW",
            "price":float(ASW_COMB["price"]),"mrp":float(ASW_COMB["mrp"]),"discount_pct":d,"stock":ASW_COMB["stock"],
            "images":ASW_COMB["imgs"],"description":ASW_COMB["desc"],"video":ASW_COMB.get("video"),
            "specs":{"Type":"Electric Spray Retractable Air Cushion Comb","Rated Voltage":"3.7V","Rated Power":"1W","Battery":"300mAh","Charging":"USB Type-C","Colours":"Beige / Purple / Pink","Brand":"ASW"},
            "badges":[f"{d}% OFF","NEW"],"featured":True,"deal":d>=25,"rating":4.5,"rating_count":327,"created_at":now_iso()})
    # ASW kitchen — portable blender
    if await db.categories.find_one({"slug":"kitchen"}) is None:
        await db.categories.insert_one({"id":new_id(),"slug":"kitchen","name":"Kitchen","icon":"Utensils","image":ASW_KITCHEN["img"],"created_at":now_iso()})
    if await db.products.find_one({"title":ASW_KITCHEN["title"]}) is None:
        d=round((1-ASW_KITCHEN["price"]/ASW_KITCHEN["mrp"])*100)
        await db.products.insert_one({"id":new_id(),"title":ASW_KITCHEN["title"],"category":"kitchen","brand":"ASW",
            "price":float(ASW_KITCHEN["price"]),"mrp":float(ASW_KITCHEN["mrp"]),"discount_pct":d,"stock":ASW_KITCHEN["stock"],
            "images":[ASW_KITCHEN["img"]],"description":ASW_KITCHEN["desc"],"video":ASW_KITCHEN.get("video"),
            "specs":{"Type":"Rechargeable Portable Blender","Height":"23.8 cm","Base Diameter":"9.9 cm","Charging":"USB Rechargeable","Colours":"Black / White","Brand":"ASW"},
            "badges":[f"{d}% OFF","NEW"],"featured":True,"deal":d>=25,"rating":4.6,"rating_count":214,"created_at":now_iso()})
    # backfill media fields (seed is insert-only, so update existing docs)
    await db.products.update_many({"title":ASW_COMB["title"]},{"$set":{"video":ASW_COMB.get("video"),"images":ASW_COMB["imgs"]}})
    await db.products.update_many({"title":ASW_KITCHEN["title"]},{"$set":{"video":ASW_KITCHEN.get("video")}})
    for _fp in ASW_PRODUCTS:
        if _fp.get("video"):
            await db.products.update_many({"title":_fp["title"]},{"$set":{"video":_fp["video"]}})

async def seed_users():
    admin_email=os.environ["ADMIN_EMAIL"].lower(); admin_pw=os.environ["ADMIN_PASSWORD"]
    existing=await db.users.find_one({"email":admin_email})
    if existing is None:
        await db.users.insert_one({"id":new_id(),"name":"Store Owner","email":admin_email,
            "phone":"9000000001","password_hash":hash_password(admin_pw),"role":"admin","created_at":now_iso()})
    elif not verify_password(admin_pw, existing.get("password_hash","")):
        await db.users.update_one({"email":admin_email},{"$set":{"password_hash":hash_password(admin_pw)}})
    for email,name,role,phone,pw in [
        ("customer@voltmart.com","Riya Sharma","customer","9000000002","Customer@123"),
        ("partner@voltmart.com","Arjun Delivery","delivery_partner","9000000003","Partner@123")]:
        if await db.users.find_one({"email":email}) is None:
            await db.users.insert_one({"id":new_id(),"name":name,"email":email,"phone":phone,
                "password_hash":hash_password(pw),"role":role,"created_at":now_iso()})

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await seed()
    await seed_users()
    logger.info("Startup seed complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ---------- Auth endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email=body.email.lower()
    if await db.users.find_one({"email":email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    role = body.role if body.role in ("customer","delivery_partner") else "customer"
    u={"id":new_id(),"name":body.name,"email":email,"phone":body.phone,
       "password_hash":hash_password(body.password),"role":role,"created_at":now_iso()}
    await db.users.insert_one(u)
    token=create_access_token(u["id"],email,role)
    return {"token":token,"user":public_user(u)}

@api.post("/auth/login")
async def login(body: LoginIn):
    email=body.email.lower()
    u=await db.users.find_one({"email":email})
    if not u or not verify_password(body.password, u.get("password_hash","")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token=create_access_token(u["id"],email,u.get("role","customer"))
    return {"token":token,"user":public_user(u)}

@api.post("/auth/otp/request")
async def otp_request(body: OtpRequestIn):
    otp="".join([str(random.randint(0,9)) for _ in range(4)])
    await db.otp_codes.update_one({"phone":body.phone},
        {"$set":{"phone":body.phone,"otp":otp,"expires_at":(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}}, upsert=True)
    logger.info(f"OTP for {body.phone}: {otp}")
    return {"message":"OTP sent","phone":body.phone,"debug_otp":otp}

@api.post("/auth/otp/verify")
async def otp_verify(body: OtpVerifyIn):
    rec=await db.otp_codes.find_one({"phone":body.phone})
    if not rec or rec["otp"]!=body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.fromisoformat(rec["expires_at"])<datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    await db.otp_codes.delete_one({"phone":body.phone})
    u=await db.users.find_one({"phone":body.phone})
    if not u:
        u={"id":new_id(),"name":body.name or f"User {body.phone[-4:]}","email":f"{body.phone}@phone.voltmart",
           "phone":body.phone,"password_hash":"","role":"customer","created_at":now_iso()}
        await db.users.insert_one(u)
    token=create_access_token(u["id"],u["email"],u.get("role","customer"))
    return {"token":token,"user":public_user(u)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

# ---------- Config / themes / layouts ----------
@api.get("/config")
async def get_config():
    s=await db.settings.find_one({"id":"store"},{"_id":0})
    return {"active_layout":s["active_layout"],"active_theme":s["active_theme"],
            "banners":s.get("banners",[]),"themes":THEMES,"layouts":LAYOUTS}

@api.put("/admin/config")
async def update_config(body: ConfigIn, admin: dict = Depends(require_admin)):
    upd={}
    if body.active_layout: upd["active_layout"]=body.active_layout
    if body.active_theme: upd["active_theme"]=body.active_theme
    if body.banners is not None: upd["banners"]=body.banners
    if upd: await db.settings.update_one({"id":"store"},{"$set":upd})
    s=await db.settings.find_one({"id":"store"},{"_id":0})
    return s

# ---------- Categories ----------
@api.get("/categories")
async def list_categories():
    return await db.categories.find({},{"_id":0}).to_list(100)

@api.post("/admin/categories")
async def create_category(body: CategoryIn, admin: dict = Depends(require_admin)):
    c={"id":new_id(),**body.model_dump(),"created_at":now_iso()}
    await db.categories.insert_one(c)
    return {k:v for k,v in c.items() if k!="_id"}

@api.delete("/admin/categories/{cid}")
async def delete_category(cid: str, admin: dict = Depends(require_admin)):
    res=await db.categories.delete_one({"id":cid})
    if res.deleted_count==0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok":True}

# ---------- Products ----------
@api.get("/products")
async def list_products(search: Optional[str]=None, category: Optional[str]=None,
    brand: Optional[str]=None, sort: str="popular", deal: Optional[str]=None,
    min_price: Optional[float]=None, max_price: Optional[float]=None,
    page: int=1, limit: int=20):
    q={}
    if search: q["title"]={"$regex":search,"$options":"i"}
    if category: q["category"]=category
    if brand: q["brand"]=brand
    if deal: q["deal"]=True
    if min_price is not None or max_price is not None:
        pr={}
        if min_price is not None: pr["$gte"]=min_price
        if max_price is not None: pr["$lte"]=max_price
        q["price"]=pr
    sort_map={"price_low":[("price",1)],"price_high":[("price",-1)],
              "rating":[("rating",-1)],"discount":[("discount_pct",-1)],
              "popular":[("rating_count",-1)],"newest":[("created_at",-1)]}
    total=await db.products.count_documents(q)
    cursor=db.products.find(q,{"_id":0}).sort(sort_map.get(sort,[("rating_count",-1)])).skip((page-1)*limit).limit(limit)
    items=await cursor.to_list(limit)
    return {"items":items,"total":total,"page":page,"limit":limit,"pages":max(1,(total+limit-1)//limit)}

@api.get("/products/brands")
async def product_brands(category: Optional[str]=None):
    q={"category":category} if category else {}
    return await db.products.distinct("brand", q)

@api.get("/products/{pid}")
async def get_product(pid: str):
    p=await db.products.find_one({"id":pid},{"_id":0})
    if not p: raise HTTPException(status_code=404, detail="Product not found")
    related=await db.products.find({"category":p["category"],"id":{"$ne":pid}},{"_id":0}).limit(8).to_list(8)
    return {"product":p,"related":related}

@api.post("/admin/products")
async def create_product(body: ProductIn, admin: dict = Depends(require_admin)):
    disc=round((1-body.price/body.mrp)*100) if body.mrp>0 else 0
    p={"id":new_id(),**body.model_dump(),"discount_pct":disc,"created_at":now_iso()}
    await db.products.insert_one(p)
    return {k:v for k,v in p.items() if k!="_id"}

@api.put("/admin/products/{pid}")
async def update_product(pid: str, body: ProductIn, admin: dict = Depends(require_admin)):
    if await db.products.find_one({"id":pid}) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    disc=round((1-body.price/body.mrp)*100) if body.mrp>0 else 0
    await db.products.update_one({"id":pid},{"$set":{**body.model_dump(),"discount_pct":disc}})
    p=await db.products.find_one({"id":pid},{"_id":0})
    return p

@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin: dict = Depends(require_admin)):
    res=await db.products.delete_one({"id":pid})
    if res.deleted_count==0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok":True}

# ---------- Cart ----------
async def get_cart_doc(uid: str):
    c=await db.carts.find_one({"user_id":uid})
    if not c:
        c={"user_id":uid,"items":[]}
        await db.carts.insert_one(c)
    return c

async def enrich_cart(uid: str):
    c=await get_cart_doc(uid)
    items=[]; subtotal=0
    for it in c["items"]:
        p=await db.products.find_one({"id":it["product_id"]},{"_id":0})
        if not p: continue
        line=p["price"]*it["qty"]; subtotal+=line
        items.append({"product":p,"qty":it["qty"],"line_total":line})
    return {"items":items,"subtotal":subtotal,"count":sum(i["qty"] for i in c["items"])}

@api.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    return await enrich_cart(user["id"])

@api.post("/cart")
async def add_cart(body: CartItemIn, user: dict = Depends(get_current_user)):
    prod=await db.products.find_one({"id":body.product_id})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    c=await get_cart_doc(user["id"])
    items=c["items"]; found=False
    for it in items:
        if it["product_id"]==body.product_id:
            it["qty"]=min(it["qty"]+body.qty, prod["stock"]); found=True; break
    if not found: items.append({"product_id":body.product_id,"qty":min(body.qty, prod["stock"])})
    await db.carts.update_one({"user_id":user["id"]},{"$set":{"items":items}})
    return await enrich_cart(user["id"])

@api.put("/cart/{pid}")
async def update_cart(pid: str, body: CartItemIn, user: dict = Depends(get_current_user)):
    prod=await db.products.find_one({"id":pid})
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    c=await get_cart_doc(user["id"])
    items=[it for it in c["items"] if it["product_id"]!=pid]
    if body.qty>0: items.append({"product_id":pid,"qty":min(body.qty, prod["stock"])})
    await db.carts.update_one({"user_id":user["id"]},{"$set":{"items":items}})
    return await enrich_cart(user["id"])

@api.delete("/cart/{pid}")
async def remove_cart(pid: str, user: dict = Depends(get_current_user)):
    c=await get_cart_doc(user["id"])
    items=[it for it in c["items"] if it["product_id"]!=pid]
    await db.carts.update_one({"user_id":user["id"]},{"$set":{"items":items}})
    return await enrich_cart(user["id"])

@api.post("/cart/apply-coupon")
async def apply_coupon(body: dict, user: dict = Depends(get_current_user)):
    code=body.get("code","").upper()
    cart=await enrich_cart(user["id"])
    cp=await db.coupons.find_one({"code":code,"active":True},{"_id":0})
    if not cp: raise HTTPException(status_code=400, detail="Invalid coupon code")
    if cart["subtotal"]<cp["min_order"]:
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{cp['min_order']:.0f} required")
    discount=min(cart["subtotal"]*cp["percent"]/100, cp["max_discount"])
    return {"code":code,"discount":round(discount),"percent":cp["percent"]}

# ---------- Coupons (admin) ----------
@api.get("/coupons")
async def list_coupons_public():
    return await db.coupons.find({"active":True},{"_id":0}).to_list(50)

@api.get("/admin/coupons")
async def list_coupons(admin: dict = Depends(require_admin)):
    return await db.coupons.find({},{"_id":0}).to_list(100)

@api.post("/admin/coupons")
async def create_coupon(body: CouponIn, admin: dict = Depends(require_admin)):
    c={"id":new_id(),**body.model_dump(),"code":body.code.upper(),"created_at":now_iso()}
    await db.coupons.insert_one(c)
    return {k:v for k,v in c.items() if k!="_id"}

@api.delete("/admin/coupons/{cid}")
async def delete_coupon(cid: str, admin: dict = Depends(require_admin)):
    res=await db.coupons.delete_one({"id":cid})
    if res.deleted_count==0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"ok":True}

# ---------- Orders ----------
STATUS_FLOW=["placed","confirmed","picked_up","in_transit","delivered"]

@api.post("/orders")
async def create_order(body: CheckoutIn, user: dict = Depends(get_current_user)):
    cart=await enrich_cart(user["id"])
    if not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")
    if body.payment_method not in ("mock","cod","razorpay"):
        raise HTTPException(status_code=400, detail="Invalid payment method")
    for i in cart["items"]:
        if i["qty"]>i["product"]["stock"]:
            raise HTTPException(status_code=400, detail=f"Only {i['product']['stock']} left of {i['product']['title']}")
    discount=0; coupon_code=None
    if body.coupon:
        cp=await db.coupons.find_one({"code":body.coupon.upper(),"active":True})
        if cp and cart["subtotal"]>=cp["min_order"]:
            discount=min(cart["subtotal"]*cp["percent"]/100, cp["max_discount"]); coupon_code=cp["code"]
    shipping=0 if cart["subtotal"]>499 else 49
    total=round(cart["subtotal"]-discount+shipping)
    order={"id":new_id(),"order_no":"VM"+str(random.randint(100000,999999)),
        "user_id":user["id"],"user_name":user.get("name"),"user_email":user.get("email"),
        "items":[{"product_id":i["product"]["id"],"title":i["product"]["title"],"image":i["product"]["images"][0],
                  "price":i["product"]["price"],"qty":i["qty"]} for i in cart["items"]],
        "subtotal":cart["subtotal"],"discount":round(discount),"shipping":shipping,"total":total,
        "coupon":coupon_code,"address":body.address,"payment_method":body.payment_method,
        "payment_status":"paid" if body.payment_method=="mock" else "pending",
        "status":"placed","delivery_partner_id":None,"delivery_partner_name":None,
        "timeline":[{"status":"placed","at":now_iso()}],"created_at":now_iso()}
    await db.orders.insert_one(order)
    for i in cart["items"]:
        await db.products.update_one({"id":i["product"]["id"]},{"$inc":{"stock":-i["qty"]}})
    await db.carts.update_one({"user_id":user["id"]},{"$set":{"items":[]}})
    return {k:v for k,v in order.items() if k!="_id"}

@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    return await db.orders.find({"user_id":user["id"]},{"_id":0}).sort([("created_at",-1)]).to_list(200)

@api.get("/orders/{oid}")
async def get_order(oid: str, user: dict = Depends(get_current_user)):
    o=await db.orders.find_one({"id":oid},{"_id":0})
    if not o: raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role")=="customer" and o["user_id"]!=user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return o

@api.get("/admin/orders")
async def all_orders(admin: dict = Depends(require_admin)):
    return await db.orders.find({},{"_id":0}).sort([("created_at",-1)]).to_list(500)

@api.put("/admin/orders/{oid}/assign")
async def assign_order(oid: str, body: AssignIn, admin: dict = Depends(require_admin)):
    partner=await db.users.find_one({"id":body.delivery_partner_id,"role":"delivery_partner"})
    if not partner: raise HTTPException(status_code=404, detail="Delivery partner not found")
    await db.orders.update_one({"id":oid},{"$set":{"delivery_partner_id":partner["id"],
        "delivery_partner_name":partner["name"],"status":"confirmed"},
        "$push":{"timeline":{"status":"confirmed","at":now_iso()}}})
    return await db.orders.find_one({"id":oid},{"_id":0})

@api.put("/orders/{oid}/status")
async def update_status(oid: str, body: StatusIn, user: dict = Depends(require_partner)):
    o=await db.orders.find_one({"id":oid})
    if not o: raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role")=="delivery_partner" and o.get("delivery_partner_id")!=user["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    if body.status not in STATUS_FLOW:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.orders.update_one({"id":oid},{"$set":{"status":body.status},
        "$push":{"timeline":{"status":body.status,"at":now_iso()}}})
    return await db.orders.find_one({"id":oid},{"_id":0})

@api.get("/delivery/orders")
async def delivery_orders(user: dict = Depends(require_partner)):
    q={} if user.get("role")=="admin" else {"delivery_partner_id":user["id"]}
    return await db.orders.find(q,{"_id":0}).sort([("created_at",-1)]).to_list(200)

# ---------- Users (admin) ----------
@api.get("/admin/users")
async def list_users(admin: dict = Depends(require_admin)):
    users=await db.users.find({},{"_id":0,"password_hash":0}).sort([("created_at",-1)]).to_list(500)
    return users

@api.put("/admin/users/{uid}/role")
async def set_role(uid: str, body: RoleIn, admin: dict = Depends(require_admin)):
    if body.role not in ("customer","admin","delivery_partner"):
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"id":uid},{"$set":{"role":body.role}})
    return {"ok":True}

@api.get("/admin/delivery-partners")
async def delivery_partners(admin: dict = Depends(require_admin)):
    return await db.users.find({"role":"delivery_partner"},{"_id":0,"password_hash":0}).to_list(100)

# ---------- Analytics ----------
@api.get("/admin/analytics")
async def analytics(admin: dict = Depends(require_admin)):
    orders=await db.orders.find({},{"_id":0}).to_list(1000)
    revenue=sum(o["total"] for o in orders)
    users_count=await db.users.count_documents({})
    products_count=await db.products.count_documents({})
    by_status={}
    for s in STATUS_FLOW: by_status[s]=0
    for o in orders: by_status[o["status"]]=by_status.get(o["status"],0)+1
    prod_sales={}
    for o in orders:
        for it in o["items"]:
            prod_sales[it["title"]]=prod_sales.get(it["title"],0)+it["qty"]
    top=sorted(prod_sales.items(), key=lambda x:-x[1])[:5]
    rev_by_day={}
    for o in orders:
        d=o["created_at"][:10]; rev_by_day[d]=rev_by_day.get(d,0)+o["total"]
    revenue_series=[{"date":k,"revenue":v} for k,v in sorted(rev_by_day.items())][-14:]
    return {"revenue":revenue,"orders_count":len(orders),"users_count":users_count,
            "products_count":products_count,"orders_by_status":[{"status":k,"count":v} for k,v in by_status.items()],
            "top_products":[{"title":k,"qty":v} for k,v in top],"revenue_series":revenue_series}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=False,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
