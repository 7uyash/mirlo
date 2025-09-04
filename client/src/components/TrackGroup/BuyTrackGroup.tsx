import Money, {
  getCurrencySymbol,
  moneyDisplay,
} from "components/common/Money";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { FormProvider, useForm } from "react-hook-form";
import PlatformPercent from "components/common/PlatformPercent";
import { css } from "@emotion/css";
import { testOwnership } from "./utils";
import Box from "components/common/Box";
import { useAuthContext } from "state/AuthContext";
import TextArea from "components/common/TextArea";
import EmbeddedStripeForm from "components/common/stripe/EmbeddedStripe";
import EmailVerification from "components/common/EmailVerification";
import Button from "components/common/Button";
import { FaArrowRight } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";
import AddMoneyValueButtons from "components/common/AddMoneyValueButtons";

interface FormData {
  chosenPrice: string;
  userEmail: string;
  message?: string;
  consentToStoreData: boolean;
}

const BuyTrackGroup: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
}> = ({ trackGroup, track }) => {
  const snackbar = useSnackbar();
  const [stripeLoading, setStripeLoading] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const { user } = useAuthContext();
  const minPrice = track?.minPrice ?? trackGroup.minPrice;
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(null);
  const methods = useForm<FormData>({
    defaultValues: {
      chosenPrice: `${minPrice ? minPrice / 100 : ""}`,
    },
    reValidateMode: "onChange",
  });
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(trackGroup.artist?.userId ?? 0)
  );
  const { register, watch, handleSubmit, formState } = methods;
  const { isValid } = formState;
  const chosenPrice = watch("chosenPrice");
  const consentToStoreData = watch("consentToStoreData");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  const purchaseAlbum = React.useCallback(
    async (data: FormData) => {
      try {
        setStripeLoading(true);
        const alreadyOwns = await testOwnership(trackGroup.id, data.userEmail);
        const confirmed = alreadyOwns
          ? window.confirm(t("albumExists") ?? "")
          : true;

        if (confirmed) {
          const url = track
            ? `tracks/${track.id}/purchase`
            : `trackGroups/${trackGroup.id}/purchase`;
          const response = await api.post<
            {},
            { redirectUrl: string; clientSecret: string }
          >(url, {
            price: data.chosenPrice
              ? Number(data.chosenPrice) * 100
              : undefined,
            email: data.userEmail ?? verifiedEmail,
            message: data.message,
          });

          if (response.clientSecret) {
            setClientSecret(response.clientSecret);
          } else {
            window.location.assign(response.redirectUrl);
          }
        }
      } catch (e) {
        snackbar(t("error"), { type: "warning" });
        console.error(e);
        setStripeLoading(false);
      }
    },
    [snackbar, t, trackGroup.id, track, verifiedEmail]
  );

  let lessThanMin = false;
  if (minPrice) {
    lessThanMin =
      isFinite(+chosenPrice) && Number(chosenPrice) < minPrice / 100;
  }

  const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();
  const purchaseText = trackGroup.isAllOrNothing
    ? "backThisProject"
    : isBeforeReleaseDate
      ? "preOrder"
      : "buy";

  const isDisabled =
    lessThanMin ||
    !isValid ||
    (trackGroup.isAllOrNothing && !consentToStoreData);

  const addMoneyAmount = (val: number) => {
    const currentPrice = Number(chosenPrice || 0);
    const newPrice = currentPrice + val;
    methods.setValue("chosenPrice", newPrice.toString());
  };

  if (clientSecret && stripeAccountStatus?.stripeAccountId) {
    return (
      <EmbeddedStripeForm
        clientSecret={clientSecret}
        isSetupIntent={trackGroup.isAllOrNothing}
        stripeAccountId={stripeAccountStatus?.stripeAccountId}
      />
    );
  }

  return (
    <FormProvider {...methods}>
      <div
        className={css`
          padding: 1.5rem 2rem 2rem;
        `}
      >
        {trackGroup.isAllOrNothing && (
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {t("backThisProjectDescription")}
          </p>
        )}
        {!!minPrice && minPrice > 0 && (
          <p>
            {t("price")}{" "}
            <Money amount={minPrice / 100} currency={trackGroup.currency} />, or
          </p>
        )}
        <form onSubmit={handleSubmit(purchaseAlbum)}>
          <FormComponent>
            <label htmlFor="priceInput">
              {t("nameYourPrice", {
                currency: getCurrencySymbol(trackGroup.currency, undefined),
              })}{" "}
            </label>
            <InputEl
              {...register("chosenPrice")}
              type="number"
              min={minPrice ? minPrice / 100 : 0}
              step="0.01"
              id="priceInput"
            />

            {Number(chosenPrice) > (minPrice ?? 1) * 100 && (
              <Box variant="success">
                {t("thatsGenerous", {
                  chosenPrice: moneyDisplay({
                    amount: chosenPrice,
                    currency: trackGroup.currency,
                  }),
                })}
              </Box>
            )}
            {lessThanMin && (
              <small>
                {t("pleaseEnterMoreThan", {
                  minPrice: (minPrice ?? 100) / 100,
                })}
              </small>
            )}
            <AddMoneyValueButtons
              addMoneyAmount={addMoneyAmount}
              currency={trackGroup.currency}
            />
            <PlatformPercent
              percent={trackGroup.platformPercent}
              chosenPrice={chosenPrice}
              currency={trackGroup.currency}
              artist={trackGroup.artist}
            />
          </FormComponent>

          <FormComponent>
            <label htmlFor="message">{t("leaveAComment")}</label>
            <TextArea id="message" {...methods.register("message")} rows={2} />
            <small>{t("messageToArtist")}</small>
          </FormComponent>

          {!user && <EmailVerification setVerifiedEmail={setVerifiedEmail} />}

          {(user || verifiedEmail) && (
            <>
              {trackGroup.isAllOrNothing && (
                <FormComponent direction="row">
                  <InputEl
                    type="checkbox"
                    id="consentToStoreData"
                    {...methods.register("consentToStoreData")}
                  />
                  <label htmlFor="consentToStoreData">
                    {t("consentToStoreData")}
                  </label>
                </FormComponent>
              )}
              <Button
                size="big"
                rounded
                type="submit"
                endIcon={<FaArrowRight />}
                isLoading={stripeLoading}
                title={
                  isDisabled
                    ? user
                      ? (t("ensurePrice") ?? "")
                      : (t("ensurePriceAndEmail") ?? "")
                    : ""
                }
                disabled={isDisabled}
              >
                {t(purchaseText)}
              </Button>
            </>
          )}

          <div
            className={css`
              margin-top: 1rem;

              small {
                display: block;
                margin-bottom: 0.5rem;
              }
            `}
          >
            <small>{t("artistCheckoutPage")}</small>

            <small>{t("downloadDisclaimer")}</small>
          </div>
        </form>
        {!isBeforeReleaseDate && (
          <>
            {!!minPrice && lessThanMin && (
              <strong>
                {t("lessThanMin", {
                  minPrice: moneyDisplay({
                    amount: minPrice / 100,
                    currency: trackGroup.currency,
                  }),
                  artistName: trackGroup.artist?.name,
                })}
              </strong>
            )}
          </>
        )}
      </div>
    </FormProvider>
  );
};

export default BuyTrackGroup;
