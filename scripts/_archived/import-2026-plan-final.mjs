import * as dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const rawRows = [
  {"month": "JANUARY", "day": "7th -17th", "program": "10 days of Prayer", "department": "Church Elders", "lead": "Eld. Nathaniel Hegbor"},
  {"month": "FEBRUARY", "day": "14th – 21st", "program": "Christian Home and Marriage Week", "department": "Home and Family life dept.", "lead": "Pastor Obeng Afari, Eld. Mrs. Helena Asamoah, Mrs. Florence Hegbor"},
  {"month": "FEBRUARY", "day": "28th", "program": "Board Meeting", "department": "Elders"},
  {"month": "MARCH", "day": "7th", "program": "Women’s Day of Prayer", "department": "Women Ministries", "lead": "*Indigenous Adventist Music"},
  {"month": "MARCH", "day": "21st", "program": "Global Youth Children’s Day", "department": "Youth Ministries", "lead": "*Indigenous Adventist Music"},
  {"month": "MARCH", "day": "21st - 28th", "program": "Youth Week of Prayer", "department": "Youth Ministries", "lead": "Indigenous Adventist Music"},
  {"month": "MARCH", "day": "28th", "program": "Christian Education Day", "department": "Church Elders", "lead": "Indigenous Adventist Music"},
  {"month": "MARCH", "day": "28th", "program": "Q.1 Board Meeting", "department": "Church Elder"},
  {"month": "APRIL", "day": "4th", "program": "AMM Convention", "department": "All Depts."},
  {"month": "APRIL", "day": "", "program": "All Night/Communion Service"},
  {"month": "APRIL", "day": "11th", "program": ""},
  {"month": "APRIL", "day": "18th", "program": "Church Retreat", "department": "Elders"},
  {"month": "APRIL", "day": "25th", "department": "Home and Family"},
  {"month": "MAY", "day": "2nd – 8th", "program": "Reach the World: Using Communication Channels", "lead": "Talk on Drug Awareness"},
  {"month": "MAY", "day": "9th – 15th", "program": "Reach the World: Community Service", "lead": "Movie Time on Drug Abuse"},
  {"month": "MAY", "day": "16th – 22nd", "program": "Adventurers Day", "department": "Youth Ministries"},
  {"month": "MAY", "day": "23rd", "program": "World Day of Prayer for Children at Risk", "department": "Children Ministries", "lead": "Visit to Pantang Hospital"},
  {"month": "MAY", "day": "25th – 30th", "program": "Adventist Week of Education", "department": "Elders", "lead": "Member Engagement [To identify visitation targets]"},
  {"month": "MAY", "day": "30th", "program": "Birthday celebration and thanksgiving offering for the monthly born.", "department": "Sabbath School"},
  {"month": "JUNE", "day": "6th", "program": "Reach the World: Bible Study/Sabbath School/Correspondence courses", "department": "Sabbath School/Personal Ministries", "lead": "Discussion on Fundamental Beliefs [Earrings]"},
  {"month": "JUNE", "day": "13th – 19th", "program": "Women’s Ministries Emphasis Day", "department": "Women Ministries Dept.", "lead": "Fundamental Beliefs [Diets]"},
  {"month": "JUNE", "day": "20th – 26th", "program": "Reach the World: Nurturing Other Members and Reclaiming", "department": "Sabbath School/ PM", "lead": "Special Visitation [Members who have not been to church in a while]"},
  {"month": "JUNE", "day": "27th", "program": "World Public Campus Ministries Day"},
  {"month": "JUNE", "day": "27th", "program": "Birthday celebration and thanksgiving offering for the monthly born."},
  {"month": "JUNE", "day": "27th", "program": "Q.2 Board Meeting", "department": "Elders"},
  {"month": "JULY", "day": "4th", "program": "Day of Prayer", "department": "Sabbath School", "lead": "All Night/Communion Service"},
  {"month": "JULY", "day": "5th – 10th", "program": "Music Week Revival", "department": "Music Department"},
  {"month": "JULY", "day": "11th – 17th", "program": "Mission Promotion", "lead": "Fundamental Beliefs [Sabbath]"},
  {"month": "JULY", "day": "18th", "program": "Reach the World: Media Ministry", "department": "Home and Family"},
  {"month": "JULY", "day": "25th", "program": "Children’s Sabbath", "department": "Children Ministries", "lead": "Career Discussions with the Kids"},
  {"month": "JULY", "day": "25th", "program": "Birthday celebration and thanksgiving offering for the monthly born."},
  {"month": "AUGUST", "day": "1st", "program": "Global Mission: Evangelism"},
  {"month": "AUGUST", "day": "8th", "program": "Church Planting"},
  {"month": "AUGUST", "day": "15th", "program": "Education"},
  {"month": "AUGUST", "day": "22nd", "program": "End It Now", "department": "Women Ministry", "lead": "Domestic Violence"},
  {"month": "AUGUST", "day": "29th", "program": "Birthday celebration and thanksgiving offering for the monthly born.", "department": "Sabbath School"},
  {"month": "AUGUST", "day": "26th", "program": "Church Board Meeting", "lead": "Child Rights and Parental Responsibilities"},
  {"month": "SEPTEMBER", "day": "5th", "program": "Youth Spiritual & Mission Commitment"},
  {"month": "SEPTEMBER", "day": "6th – 12th", "program": "Family Togetherness Week", "lead": "Family Activity"},
  {"month": "SEPTEMBER", "day": "12th –", "program": "Mission Promotion", "lead": "Types of Marriages"},
  {"month": "SEPTEMBER", "day": "19th", "program": "Pathfinder Day", "department": "Youth Ministries", "lead": "Choosing a Life Partner"},
  {"month": "SEPTEMBER", "day": "26th", "program": "Sabbath School Guest Day", "department": "Sabbath School", "lead": "Managing the Home"},
  {"month": "SEPTEMBER", "day": "26th", "program": "Birthday celebration and thanksgiving offering for the monthly born.", "department": "Sabbath School"},
  {"month": "SEPTEMBER", "day": "26th", "program": "Q.3 Board Meeting", "department": "Elders"},
  {"month": "OCTOBER", "day": "3rd", "program": "Day of Prayer/Adventist Review Promotion", "department": "Sabbath School/PM", "lead": "All Night/Communion Service"},
  {"month": "OCTOBER", "day": "10th", "program": "Pastor Appreciation Day", "department": "Church", "lead": "Divorce"},
  {"month": "OCTOBER", "day": "17th", "program": "S.O.P/Adventist Heritage Day", "department": "PM", "lead": "Child Adoption and Foster Care"},
  {"month": "OCTOBER", "day": "24th", "program": "Creation Sabbath", "lead": "Visit a village church"},
  {"month": "OCTOBER", "day": "31st", "lead": "Lecture on Entrepreneurship"},
  {"month": "NOVEMBER", "day": "7th – 14th", "program": "Week of Prayer", "department": "PM"},
  {"month": "NOVEMBER", "day": "14th – 20th", "program": "E-Week of Prayer for Youth and Young Adults", "department": "Youth Ministries", "lead": "Youth Prayer Connect online"},
  {"month": "NOVEMBER", "day": "14th", "program": "Mission Promotion: Annual Sacrifice Offering", "department": "Elders", "lead": "Music Afternoon [Choir]"},
  {"month": "NOVEMBER", "day": "21st", "program": "World Orphans and Vulnerable Children Day", "department": "Children Ministries", "lead": "Visit to an orphanage"},
  {"month": "NOVEMBER", "day": "28th", "program": "HIV Awareness Day", "department": "Health & Temperance", "lead": "Presentation/Movie on HIV"},
  {"month": "NOVEMBER", "day": "28th", "program": "Birthday celebration and thanksgiving offering for the monthly born."},
  {"month": "NOVEMBER", "day": "28th – 5th December", "program": "Stewardship Revival Week", "department": "Stewardship Dept"},
  {"month": "DECEMBER", "day": "5th", "program": "Stewardship Sabbath", "lead": "Business Meeting"},
  {"month": "DECEMBER", "day": "12th", "program": "Health Emphasis Day", "department": "Health Dept.", "lead": "Stress Management"},
  {"month": "DECEMBER", "day": "19th", "program": "Carol Service"},
  {"month": "DECEMBER", "day": "23rd – 30th", "program": "Pathfinder Camporee", "department": "Youth Ministries"},
  {"month": "DECEMBER", "day": "30th", "program": "Birthday celebration and thanksgiving offering for the monthly born.", "department": "Sabbath School"},
  {"month": "DECEMBER", "day": "30th", "program": "Thanks Get Together"},
  {"month": "DECEMBER", "day": "30th", "program": "Church Board Meeting"},
  {"month": "DECEMBER", "day": "30th", "program": "Communion Service", "lead": "Eld Hegbor & Eld. Doe"},
  {"month": "DECEMBER", "day": "30", "program": "Day of Prayer and Fasting", "department": "Elders"}
];

const MONTH_MAP = {"JANUARY":1,"FEBRUARY":2,"MARCH":3,"APRIL":4,"MAY":5,"JUNE":6,"JULY":7,"AUGUST":8,"SEPTEMBER":9,"OCTOBER":10,"NOVEMBER":11,"DECEMBER":12};

async function main() {
  await client.connect();

  try {
    const churchRes = await client.query("SELECT id FROM churches WHERE name ILIKE '%gloryland%' LIMIT 1");
    const churchId = churchRes.rows[0]?.id || null;

    await client.query("DELETE FROM events WHERE description ILIKE '%Church Elders%' OR title LIKE '%Week of Prayer%' OR description LIKE '%2026%' OR title ILIKE '%Board Meeting%' LIMIT 100");

    let count = 0;
    for (const row of rawRows) {
      const month = row.month?.toUpperCase();
      if (!MONTH_MAP[month]) continue;

      const monthNum = MONTH_MAP[month];
      let dayNum = 1;
      if (row.day) {
        const dayMatch = row.day.toString().match(/(\\d{1,2})/);
        if (dayMatch) dayNum = parseInt(dayMatch[1]);
      }

      const title = row.program || row.department || row.lead || `${month} Program`;
      const description = [month, row.day, row.department, row.lead].filter(Boolean).join(' - ');

      const startDateStr = `2026-${monthNum.toString().padStart(2,'0')}-${dayNum.toString().padStart(2,'0')} 09:00:00+00`;

      await client.query(`
        INSERT INTO events (church_id, title, description, start_date)
        VALUES ($1, $2, $3, $4)
      `, [churchId, title, description, startDateStr]);

      count++;
    }

    const total = await client.query("SELECT COUNT(*) as total FROM events WHERE start_date >= '2026-01-01'::timestamptz");
    console.log(`✅ Imported ${count} events from Gloryland SDA Church Plan 2026 into events table.`);
    console.log(`Total 2026 events: ${total.rows[0].total}`);
    console.log('DB tables checked and data parsed/inserted successfully.');

  } catch (error) {
    console.error('❌ Import error:', error.message);
  } finally {
    await client.end();
  }
}

main();

