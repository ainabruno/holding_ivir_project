import os
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./holding_ivir.db")
if "pytest" in os.environ.get("_", "") or os.getenv("TESTING") == "true":
    DATABASE_URL = "sqlite:///./test_holding_ivir.db"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    if "ssl=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0]
    if "+pymysql" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://")
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class LegalDocumentModel(Base):
    __tablename__ = "legal_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source = Column(String(100), index=True, nullable=False)
    id_source = Column(String(255), unique=True, index=True, nullable=False)
    url_source = Column(Text, nullable=True)
    type_document = Column(String(255), nullable=True)
    juridiction = Column(String(255), index=True, nullable=True)
    date_decision = Column(String(50), nullable=True)
    date_collecte = Column(DateTime, default=datetime.utcnow, nullable=False)
    texte_brut = Column(Text, nullable=True)
    hash_dedup = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    entity = relationship("LegalEntityModel", back_populates="document", uselist=False, cascade="all, delete-orphan")

class LegalEntityModel(Base):
    __tablename__ = "legal_entities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("legal_documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    source_id = Column(String(255), index=True, nullable=False)
    juridiction = Column(String(255), index=True, nullable=True)
    verdict = Column(String(50), index=True, nullable=False)
    montant_alloue = Column(Float, nullable=True)
    parties = Column(Text, nullable=True)
    references_legales = Column(Text, nullable=True)
    niveau_confiance = Column(Float, nullable=False)
    resume_automatique = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    document = relationship("LegalDocumentModel", back_populates="entity")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
