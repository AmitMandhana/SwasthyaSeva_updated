"use client";

import { useState } from "react";
import {
  TextField,
  SelectField,
  TextAreaField,
  ImageUpload,
  ToggleSwitch,
  Checkbox,
  TagMultiSelect,
  TabPillMultiSelect,
  OTPInput,
} from "@swasthyaseva/ui";

const SECTION_CLS = "space-y-4 p-6 rounded-xl border border-border bg-card";
const HEADING_CLS = "text-lg font-semibold text-card-alt";
const SUBHEADING_CLS = "text-sm font-medium text-muted-alt";
const GRID_CLS = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

const SELECT_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const TAG_OPTIONS = [
  { value: "PED", label: "Pediatrics" },
  { value: "CARD", label: "Cardiology" },
  { value: "DERM", label: "Dermatology" },
  { value: "ORTH", label: "Orthopedics" },
  { value: "ENT", label: "ENT" },
  { value: "GYN", label: "Gynecology" },
];

const PILL_OPTIONS = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "pending", label: "Pending" },
  { key: "archived", label: "Archived" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={SECTION_CLS}>
      <h2 className={HEADING_CLS}>{title}</h2>
      {children}
    </section>
  );
}

export default function FieldShowcasePage() {
  const [text, setText] = useState("");
  const [textFilled, setTextFilled] = useState("John Doe");
  const [textError, setTextError] = useState("This field has an error");
  const [password, setPassword] = useState("secret123");
  const [email, setEmail] = useState("user@example.com");
  const [number, setNumber] = useState("42");
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [numFee, setNumFee] = useState("500");
  const [numHeight, setNumHeight] = useState("175");
  const [numWeight, setNumWeight] = useState("70");
  const [numDuration, setNumDuration] = useState("7");
  const [select, setSelect] = useState("");
  const [selectFilled, setSelectFilled] = useState("wed");
  const [textarea, setTextarea] = useState("");
  const [textareaFilled, setTextareaFilled] = useState("This is a longer text that demonstrates the textarea field component with some content.");
  const [toggle, setToggle] = useState(false);
  const [toggleOn, setToggleOn] = useState(true);
  const [checkbox, setCheckbox] = useState(false);
  const [checkboxOn, setCheckboxOn] = useState(true);
  const [checkboxDesc, setCheckboxDesc] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsFilled, setTagsFilled] = useState<string[]>(["PED", "CARD", "ENT"]);
  const [pills, setPills] = useState<string[]>([]);
  const [pillsFilled, setPillsFilled] = useState<string[]>(["active", "pending"]);
  const [imageUrl, setImageUrl] = useState("");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-card-alt">Field Showcase</h1>
          <p className="text-sm text-muted-alt">
            All field components rendered in every state. Local dev only.
          </p>
        </header>

        {/* ═══ TEXT FIELD ═══ */}
        <Section title="TextField">
          <p className={SUBHEADING_CLS}>Standard text input with label, error, required indicator, icon, and unit support.</p>
          <div className={GRID_CLS}>
            <TextField label="Empty" value={text} onChange={setText} placeholder="Type something..." data-testid="tf-empty" />
            <TextField label="Filled" value={textFilled} onChange={setTextFilled} data-testid="tf-filled" />
            <TextField label="Required" value="" onChange={() => {}} required placeholder="Required field" data-testid="tf-required" />
            <TextField label="With Error" value="bad value" onChange={() => {}} error={textError} data-testid="tf-error" />
            <TextField label="Disabled" value="Can't edit" onChange={() => {}} disabled data-testid="tf-disabled" />
            <TextField label="With Placeholder" value="" onChange={() => {}} placeholder="Enter your name..." data-testid="tf-placeholder" />
            <TextField label="With Unit" value={number} onChange={setNumber} type="number" unit="₹" data-testid="tf-unit" />
            <TextField label="With Icon" value="" onChange={() => {}} placeholder="Search..." icon={<span className="text-xs">🔍</span>} data-testid="tf-icon" />
            <TextField label="With Label Suffix" value="" onChange={() => {}} labelSuffix={<span className="text-xs text-success">✓ Available</span>} data-testid="tf-suffix" />
          </div>
        </Section>

        {/* ═══ PASSWORD ═══ */}
        <Section title="TextField — Password">
          <p className={SUBHEADING_CLS}>Password fields. Currently no show/hide toggle (planned improvement).</p>
          <div className={GRID_CLS}>
            <TextField label="Password (empty)" value="" onChange={() => {}} type="password" placeholder="Enter password" autoComplete="new-password" data-testid="pw-empty" />
            <TextField label="Password (filled)" value={password} onChange={setPassword} type="password" autoComplete="current-password" data-testid="pw-filled" />
            <TextField label="Password (error)" value="short" onChange={() => {}} type="password" error="Must be at least 12 characters" data-testid="pw-error" />
          </div>
        </Section>

        {/* ═══ EMAIL ═══ */}
        <Section title="TextField — Email">
          <p className={SUBHEADING_CLS}>Email field using type=&quot;email&quot;.</p>
          <div className={GRID_CLS}>
            <TextField label="Email" value={email} onChange={setEmail} type="email" placeholder="user@example.com" data-testid="email-filled" />
            <TextField label="Email (error)" value="not-an-email" onChange={() => {}} type="email" error="Invalid email format" data-testid="email-error" />
          </div>
        </Section>

        {/* ═══ PHONE ═══ */}
        <Section title="TextField — Phone">
          <p className={SUBHEADING_CLS}>Phone fields. No +91 prefix support yet (planned).</p>
          <div className={GRID_CLS}>
            <TextField label="Phone" value={phone} onChange={setPhone} placeholder="+919876543210" autoComplete="tel" data-testid="phone-filled" />
            <TextField label="Phone (error)" value="12345" onChange={() => {}} error="Must have exactly 10 digits after +91" data-testid="phone-error" />
          </div>
        </Section>

        {/* ═══ OTP ═══ */}
        <Section title="OTPInput">
          <p className={SUBHEADING_CLS}>6-digit OTP with individual boxes, auto-advance, paste support, numeric-only.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className={SUBHEADING_CLS}>Empty</p>
              <OTPInput value={otp} onChange={setOtp} data-testid="otp-new" autoFocus={false} />
            </div>
            <div className="space-y-2">
              <p className={SUBHEADING_CLS}>With error</p>
              <OTPInput value="12" onChange={() => {}} error="Invalid OTP" data-testid="otp-error" />
            </div>
            <div className="space-y-2">
              <p className={SUBHEADING_CLS}>Filled</p>
              <OTPInput value="123456" onChange={() => {}} data-testid="otp-filled" />
            </div>
            <div className="space-y-2">
              <p className={SUBHEADING_CLS}>Disabled</p>
              <OTPInput value="123456" onChange={() => {}} disabled data-testid="otp-disabled" />
            </div>
          </div>
        </Section>

        {/* ═══ NUMBER ═══ */}
        <Section title="TextField — Number">
          <p className={SUBHEADING_CLS}>Numeric inputs. Some use type=&quot;number&quot;, some plain text.</p>
          <div className={GRID_CLS}>
            <TextField label="Fee (₹)" value={numFee} onChange={setNumFee} type="number" unit="₹" data-testid="num-fee" />
            <TextField label="Height (cm)" value={numHeight} onChange={setNumHeight} type="number" unit="cm" data-testid="num-height" />
            <TextField label="Weight (kg)" value={numWeight} onChange={setNumWeight} type="number" unit="kg" data-testid="num-weight" />
            <TextField label="Duration (days)" value={numDuration} onChange={setNumDuration} type="number" data-testid="num-duration" />
          </div>
        </Section>

        {/* ═══ SELECT ═══ */}
        <Section title="SelectField">
          <p className={SUBHEADING_CLS}>Single-select dropdown. Searchable when 5+ options.</p>
          <div className={GRID_CLS}>
            <SelectField label="Day (empty)" value={select} onChange={setSelect} options={SELECT_OPTIONS} placeholder="Pick a day" data-testid="sel-empty" />
            <SelectField label="Day (filled)" value={selectFilled} onChange={setSelectFilled} options={SELECT_OPTIONS} data-testid="sel-filled" />
            <SelectField label="Day (required)" value="" onChange={() => {}} options={SELECT_OPTIONS} required error="Day is required" data-testid="sel-error" />
            <SelectField label="Day (disabled)" value="mon" onChange={() => {}} options={SELECT_OPTIONS} disabled data-testid="sel-disabled" />
          </div>
        </Section>

        {/* ═══ TEXTAREA ═══ */}
        <Section title="TextAreaField">
          <p className={SUBHEADING_CLS}>Multi-line text with optional character counter.</p>
          <div className={GRID_CLS}>
            <TextAreaField label="Notes (empty)" value={textarea} onChange={setTextarea} placeholder="Enter notes..." data-testid="ta-empty" />
            <TextAreaField label="Notes (filled)" value={textareaFilled} onChange={setTextareaFilled} data-testid="ta-filled" />
            <TextAreaField label="Bio (max 200)" value={textareaFilled} onChange={setTextareaFilled} maxLength={200} data-testid="ta-maxlen" />
            <TextAreaField label="Notes (error)" value="" onChange={() => {}} required error="Notes are required" data-testid="ta-error" />
            <TextAreaField label="Notes (disabled)" value="Read only content" onChange={() => {}} disabled data-testid="ta-disabled" />
          </div>
        </Section>

        {/* ═══ TOGGLE ═══ */}
        <Section title="ToggleSwitch">
          <p className={SUBHEADING_CLS}>Binary on/off switch with accessible role=&quot;switch&quot;.</p>
          <div className={GRID_CLS}>
            <ToggleSwitch label="Off state" checked={toggle} onChange={setToggle} data-testid="tog-off" />
            <ToggleSwitch label="On state" checked={toggleOn} onChange={setToggleOn} data-testid="tog-on" />
            <ToggleSwitch label="Disabled" checked={false} onChange={() => {}} disabled data-testid="tog-disabled" />
          </div>
        </Section>

        {/* ═══ CHECKBOX ═══ */}
        <Section title="Checkbox">
          <p className={SUBHEADING_CLS}>Single checkbox with optional description.</p>
          <div className={GRID_CLS}>
            <Checkbox label="Unchecked" checked={checkbox} onChange={setCheckbox} />
            <Checkbox label="Checked" checked={checkboxOn} onChange={setCheckboxOn} />
            <Checkbox label="With description" checked={checkboxDesc} onChange={setCheckboxDesc} description="This explains what the checkbox does" />
            <Checkbox label="Disabled" checked={false} onChange={() => {}} disabled />
          </div>
        </Section>

        {/* ═══ TAG MULTI-SELECT ═══ */}
        <Section title="TagMultiSelect">
          <p className={SUBHEADING_CLS}>Multi-select with searchable dropdown and chip display.</p>
          <div className={GRID_CLS}>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Tags (empty)</label>
              <TagMultiSelect options={TAG_OPTIONS} selected={tags} onChange={setTags} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Tags (3 selected)</label>
              <TagMultiSelect options={TAG_OPTIONS} selected={tagsFilled} onChange={setTagsFilled} />
            </div>
          </div>
        </Section>

        {/* ═══ TAB PILL MULTI-SELECT ═══ */}
        <Section title="TabPillMultiSelect">
          <p className={SUBHEADING_CLS}>Horizontal pill buttons for small option sets.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Status (none selected)</label>
              <TabPillMultiSelect options={PILL_OPTIONS} selected={pills} onChange={setPills} />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Status (2 selected)</label>
              <TabPillMultiSelect options={PILL_OPTIONS} selected={pillsFilled} onChange={setPillsFilled} />
            </div>
          </div>
        </Section>

        {/* ═══ IMAGE UPLOAD ═══ */}
        <Section title="ImageUpload">
          <p className={SUBHEADING_CLS}>Image upload with preview, 5MB limit, image/* only.</p>
          <div className={GRID_CLS}>
            <ImageUpload label="Profile Photo" value={imageUrl} onChange={setImageUrl} />
            <ImageUpload label="Required Photo" value="" onChange={() => {}} required error="Photo is required" />
          </div>
        </Section>

        {/* ═══ NATIVE HTML FIELDS ═══ */}
        <Section title="Native HTML Inputs (not using shared components)">
          <p className={SUBHEADING_CLS}>These are used raw in the codebase and should be migrated to shared components.</p>
          <div className={GRID_CLS}>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Date (native)</label>
              <input type="date" className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-background border-2 border-border/80 text-card-alt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Time (native)</label>
              <input type="time" className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-background border-2 border-border/80 text-card-alt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Number (native spinner)</label>
              <input type="number" min={0} max={100} value={42} readOnly className="w-full rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary bg-background border-2 border-border/80 text-card-alt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-alt mb-2">Radio buttons (raw)</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-card-alt"><input type="radio" name="demo-radio" defaultChecked className="accent-primary" /> Option A</label>
                <label className="flex items-center gap-2 text-sm text-card-alt"><input type="radio" name="demo-radio" className="accent-primary" /> Option B</label>
              </div>
            </div>
          </div>
        </Section>

        <footer className="text-center text-xs text-muted-alt py-8">
          Field Showcase — dev only — not included in production build
        </footer>
      </div>
    </div>
  );
}
