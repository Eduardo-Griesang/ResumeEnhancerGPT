-- CreateTable
CREATE TABLE "OptimizedResume" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "originalResume" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "OptimizedResume_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OptimizedResume" ADD CONSTRAINT "OptimizedResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
