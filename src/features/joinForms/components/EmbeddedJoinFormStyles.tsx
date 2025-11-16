export const EmbeddedJoinFormStyles = ({
  stylesheet,
}: {
  stylesheet?: string;
}) => {
  if (stylesheet) {
    return <style>{`@import url(${stylesheet})`}</style>;
  }

  return (
    <style>{`
      html {
        box-sizing: border-box;      
      }
      
      * {
        box-sizing: inherit;
      }
    
      body {
        padding: 0.5rem;  
        margin: 0;
        color: rgba(0, 0, 0, 0.87);
        font-family: azo-sans-web,sans-serif;
        font-weight: 400;
        font-size: 1rem;
        line-height: 1.5;  
        background-color: #F9F9F9;
      }

      .zetkin-joinform__field {
        margin-bottom: 1rem;
      }

      .zetkin-joinform__field input.zetkin-joinform__text-input, .zetkin-joinform__field select {
        width: 100%;
        max-width: 600px;
        padding: 0.3rem;
        font-size: 1.5rem;
      }

      .zetkin-joinform__submit-button {
        border-width: 0;
        font-size: 1.5rem;
        background-color: black;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.2rem;
        cursor: pointer;
      }
    `}</style>
  );
};
