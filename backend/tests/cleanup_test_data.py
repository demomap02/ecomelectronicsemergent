"""Utility: remove TEST_-prefixed users/orders/products created by the test suites."""
import pymongo
from dotenv import dotenv_values

env = dotenv_values("/app/backend/.env")
cli = pymongo.MongoClient(env["MONGO_URL"])
db = cli[env["DB_NAME"]]

test_users = list(db.users.find({"$or": [{"email": {"$regex": "^test_", "$options": "i"}},
                                         {"name": {"$regex": "^TEST "}}]}, {"id": 1, "email": 1}))
ids = [u["id"] for u in test_users]
o = db.orders.delete_many({"$or": [{"user_id": {"$in": ids}}, {"user_email": {"$regex": "^test_", "$options": "i"}}]})
c = db.carts.delete_many({"user_id": {"$in": ids}})
u = db.users.delete_many({"id": {"$in": ids}})
p = db.products.delete_many({"title": {"$regex": "^TEST_"}})
print(f"deleted users={u.deleted_count} orders={o.deleted_count} carts={c.deleted_count} products={p.deleted_count}")
print("remaining delivery partners:", [x["email"] for x in db.users.find({"role": "delivery_partner"}, {"email": 1})])
cli.close()
