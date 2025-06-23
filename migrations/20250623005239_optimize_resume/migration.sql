/*
  Warnings:

  - Added the required column `jobId` to the `OptimizedResume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OptimizedResume" ADD COLUMN     "jobId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OptimizedResume" ADD CONSTRAINT "OptimizedResume_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
