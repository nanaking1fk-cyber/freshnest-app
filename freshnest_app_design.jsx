import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function FeedbackForm() {
  const [testimonialInput, setTestimonialInput] = useState({ name: "", text: "" });

  return (
    <div className="bg-white p-4 rounded">
      <Textarea 
        placeholder="Your Feedback" 
        maxLength={500} 
        value={testimonialInput.text} 
        onChange={e => setTestimonialInput({ name: testimonialInput.name, text: e.target.value.slice(0, 500) })} 
      />
    </div>
  );
}
