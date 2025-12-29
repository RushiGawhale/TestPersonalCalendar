/***********************
 * SUPABASE CONFIG
 ***********************/
/************** SUPABASE **************/
const SUPABASE_URL = "https://ubrpgbnspdlgpcdlwluc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicnBnYm5zcGRsZ3BjZGx3bHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjEyNTEsImV4cCI6MjA4MjU5NzI1MX0.iTV99bkvPjwpbm1qM9TgHfqoL0Zs6u2u0OLqmCnwDw4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/************** PASSWORD **************/
const PASSWORD = "mySecret123";

window.checkPassword = function () {
  const val = document.getElementById("passwordInput").value;
  if (val === PASSWORD) {
    document.getElementById("authOverlay").style.display = "none";
  } else {
    document.getElementById("authError").innerText = "Wrong password ❌";
  }
};

/************** GLOBALS **************/
let calendar;
let editingEvent = null;
let selectedDate = null;

const colors = ["#1e3a8a", "#065f46", "#7c2d12", "#581c87"];

/************** TIME DROPDOWNS **************/
function populateTimes() {
  const from = document.getElementById("eventFrom");
  const to = document.getElementById("eventTo");

  for (let h = 0; h < 24; h++) {
    for (let m of ["00", "30"]) {
      const t = `${String(h).padStart(2, "0")}:${m}`;
      from.add(new Option(t, t));
      to.add(new Option(t, t));
    }
  }

  from.value = "10:00";
  to.value = "11:00";
}

/************** MODAL **************/
window.closeModal = function () {
  editingEvent = null;
  document.getElementById("deleteBtn").style.display = "none";
  document.getElementById("eventModal").style.display = "none";
};

window.saveEvent = async function () {
  const title = eventTitle.value;
  const from = eventFrom.value;
  const to = eventTo.value;

  if (!title) return;

  const color =
    editingEvent?.backgroundColor ||
    colors[Math.floor(Math.random() * colors.length)];

  if (editingEvent) {
    editingEvent.setProp("title", title);
    editingEvent.setStart(`${selectedDate}T${from}`);
    editingEvent.setEnd(`${selectedDate}T${to}`);

    await supabaseClient.from("PersonalCalendarEvents").upsert({
      id: editingEvent.id,
      title,
      start: `${selectedDate}T${from}`,
      end: `${selectedDate}T${to}`,
      color,
    });
  } else {
    const { data } = await supabaseClient
      .from("PersonalCalendarEvents")
      .insert({
        title,
        start: `${selectedDate}T${from}`,
        end: `${selectedDate}T${to}`,
        color,
      })
      .select()
      .single();

    calendar.addEvent(data);
  }

  closeModal();
};

window.deleteEvent = async function () {
  if (!editingEvent) return;

  await supabaseClient.from("PersonalCalendarEvents").delete().eq("id", editingEvent.id);

  editingEvent.remove();
  closeModal();
};

/************** INIT **************/
document.addEventListener("DOMContentLoaded", async function () {
  populateTimes();

  const { data } = await supabaseClient.from("PersonalCalendarEvents").select("*");

  calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    events: data,

    dateClick(info) {
      selectedDate = info.dateStr;
      editingEvent = null;

      eventTitle.value = "";
      deleteBtn.style.display = "none";
      eventModal.style.display = "flex";
    },

    eventClick(info) {
      editingEvent = info.event;
      const s = info.event.start;
      const e = info.event.end;

      selectedDate = s.toISOString().split("T")[0];
      eventTitle.value = info.event.title;
      eventFrom.value = s.toTimeString().slice(0, 5);
      eventTo.value = e.toTimeString().slice(0, 5);

      deleteBtn.style.display = "inline-block";
      eventModal.style.display = "flex";
    },
  });

  calendar.render();
});
