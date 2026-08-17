from backend.legifrance_client import LegifranceClient

client = LegifranceClient(timeout=20)
print({"ping": client.ping()})
rows = client.search_jurisprudence(keywords="malfaçon construction", page=1, page_size=2)
print({"rows_received": len(rows), "sample_keys": sorted(rows[0].keys()) if rows else []})
